# Stack Toast - Implementation Brief

This animation is two pieces:

- `ToastProvider.tsx`
- `Toast.tsx`

The consumer wraps the app in `ToastProvider` and calls `showToast({ message })` from the `useToast` hook.

## Required packages

```tsx
react-native-reanimated
react-native-gesture-handler
react-native-worklets
expo-haptics
react-native-safe-area-context
react-native-svg
lucide-react-native
```

## Data shapes and constants

```tsx
export interface ToastConfig {
  id: number
  message: string
  actionText?: string
  onActionPress?: () => void
}

interface ToastEntry extends ToastConfig {
  exiting?: boolean // exit animation running; no longer occupies a stack slot
}

const ENTER_OFFSET = 200      // entrance travel, clears the bottom edge
const HIDDEN_SCALE = 0.7
const AUTO_DISMISS_MS = 3000
const FADE_IN_MS = 200
const EXIT_MS = 160
const EXIT_DROP = 40          // front-toast slide-down on close/timeout
const SWIPE_EXIT_DROP = 80    // extra travel a swipe keeps after release
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1)
const DISMISS_DISTANCE = 56   // drag distance that commits a dismiss
const DISMISS_VELOCITY = 800  // flick velocity that commits a dismiss

const STACK_PEEK = 14         // each toast behind peeks up this much
const STACK_SCALE_STEP = 0.05 // and shrinks this much per step
const MAX_VISIBLE = 3         // deeper entries fade out
```

## Provider and stack index

The provider owns the toast array. Ids come from a ref counter and only grow. Oldest renders first so newer toasts sit on top without animated zIndex.

```tsx
const [toasts, setToasts] = useState<ToastEntry[]>([])
const nextId = useRef(1)

const showToast = useCallback((options: ToastOptions) => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  setToasts((current) => [...current, { id: nextId.current++, ...options }])
}, [])

const handleDismissStart = useCallback((id: number) => {
  setToasts((current) =>
    current.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
  )
}, [])

const handleDismissed = useCallback((id: number) => {
  setToasts((current) => current.filter((t) => t.id !== id))
}, [])
```

Each toast's stack index is the count of non-exiting newer entries. Index 0 is the front.

```tsx
{toasts.map((toast) => (
  <Toast
    key={toast.id}
    toast={toast}
    index={toasts.filter((t) => !t.exiting && t.id > toast.id).length}
    onDismissStart={handleDismissStart}
    onDismissed={handleDismissed}
  />
))}
```

A dismissing toast flips `exiting` immediately (`onDismissStart`), so the toasts behind spring forward while it fades. It is removed from state only after the fade (`onDismissed`).

## Entrance and stack layout

Each toast owns five shared values. `progress` is entrance-only; the exit is a slide-down fade, not the spring reversed.

```tsx
const progress = useSharedValue(0) // 0 = below the edge, 1 = resting
const opacity = useSharedValue(0)
const dragY = useSharedValue(0)
const stackY = useSharedValue(-index * STACK_PEEK)
const stackScale = useSharedValue(1 - index * STACK_SCALE_STEP)
```

Animate in once on mount and start the auto-dismiss timer:

```tsx
useEffect(() => {
  progress.set(reduced ? 1 : withSpring(1))
  opacity.set(withTiming(1, { duration: FADE_IN_MS }))
  restartTimer()
  return clearTimer
}, [])
```

Follow the stack when the index shifts. Entries past `MAX_VISIBLE` fade instead of poking out of the top.

```tsx
useEffect(() => {
  if (exitingRef.current) return
  const y = -index * STACK_PEEK
  const scale = 1 - index * STACK_SCALE_STEP
  stackY.set(reduced ? y : withSpring(y))
  stackScale.set(reduced ? scale : withSpring(scale))
  if (index >= MAX_VISIBLE) {
    opacity.set(withTiming(0, { duration: FADE_IN_MS }))
  }
}, [index, opacity, reduced, stackScale, stackY])
```

One animated style combines entrance, stack position, and drag:

```tsx
const animatedStyle = useAnimatedStyle(() => {
  const p = progress.get()
  return {
    opacity: opacity.get(),
    transform: [
      { translateY: (1 - p) * ENTER_OFFSET + stackY.get() + dragY.get() },
      { scale: (HIDDEN_SCALE + (1 - HIDDEN_SCALE) * p) * stackScale.get() },
    ],
  }
})
```

The container is absolutely positioned at `bottom: insets.bottom + 16` with `left: 16`, `right: 16`, and a static `zIndex: 100`.

## Drag gesture

Upward drags resist toward a ~40px asymptote. Downward drags follow the finger raw.

```tsx
function rubberBand(distance: number) {
  'worklet'
  return (40 * distance) / (distance + 120)
}

const pan = Gesture.Pan()
  .enabled(index === 0) // only the front toast is under the finger
  .onBegin(() => {
    scheduleOnRN(clearTimer) // a held toast shouldn't vanish
  })
  .onUpdate((e) => {
    dragY.set(
      e.translationY >= 0 ? e.translationY : -rubberBand(-e.translationY),
    )
  })
  .onEnd((e) => {
    if (e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
      scheduleOnRN(commitSwipeDismiss)
    } else {
      dragY.set(withSpring(0))
      scheduleOnRN(restartTimer)
    }
  })
  .onFinalize((_e, success) => {
    if (!success) scheduleOnRN(restartTimer)
  })
```

`commitSwipeDismiss` fires `Haptics.impactAsync(Light)` then `dismiss('swipe')`.

## Dismissal paths

One `dismiss(kind)` handles timeout, close button, and swipe. An `exitingRef` guards against races between them. The fade is a timing animation; the drop depends on the kind.

```tsx
const dismiss = useCallback(
  (kind: 'timeout' | 'close' | 'swipe') => {
    if (exitingRef.current) return
    exitingRef.current = true
    clearTimer()
    onDismissStart(toast.id) // promote the toasts behind right away

    opacity.set(
      withTiming(0, { duration: EXIT_MS }, (finished) => {
        if (finished) scheduleOnRN(finishDismiss)
      }),
    )
    if (reduced) return
    if (kind === 'swipe') {
      dragY.set(
        withTiming(dragY.get() + SWIPE_EXIT_DROP, {
          duration: EXIT_MS,
          easing: EASE_OUT,
        }),
      )
    } else if (indexRef.current === 0) {
      dragY.set(withTiming(EXIT_DROP, { duration: EXIT_MS, easing: EASE_OUT }))
    }
    // a toast expiring behind the front just fades where it sits
  },
  [clearTimer, dragY, finishDismiss, onDismissStart, opacity, reduced, toast.id],
)
```

The auto-dismiss timer closes over an old render, so the current index is read through a ref:

```tsx
const indexRef = useRef(index)
indexRef.current = index

const restartTimer = useCallback(() => {
  if (exitingRef.current) return
  clearTimer()
  timerRef.current = setTimeout(() => dismiss('timeout'), AUTO_DISMISS_MS)
}, [clearTimer, dismiss])
```

## Toast visuals

A dark rounded row: leading checkmark icon, `numberOfLines={2}` message, optional uppercase action button (calls `onActionPress` then `dismiss('close')`), and a close icon button. Both pressables use `hitSlop={8}`.

```tsx
container: {
  position: 'absolute',
  left: 16,
  right: 16,
  borderRadius: 16,
  borderCurve: 'continuous',
  borderWidth: 1,
  zIndex: 100,
  boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.25)',
},
```

## Consumer usage

```tsx
const { showToast } = useToast()

showToast({ message: 'Changes saved' })
showToast({
  message: 'Link copied',
  actionText: 'Undo',
  onActionPress: handleUndo,
})
```

Wrap the screen in `ToastProvider` (and `SafeAreaProvider` if the app does not already have one).

## Do not change these behaviors

- Stack index = count of non-exiting entries with a higher id, not array position.
- `onDismissStart` fires at the start of the exit; removal waits for the fade.
- Upward drag goes through `rubberBand`; downward drag is raw.
- Dismiss commits on distance (`56`) OR velocity (`800`).
- Pan is enabled only on the front toast (`index === 0`).
- Timer clears in `onBegin` and restarts on every non-dismissing gesture end, including failed gestures in `onFinalize`.
- Exit is `withTiming` (160ms, ease-out bezier), never the entrance spring reversed.
- Use `withSpring` with the default config, target value only.
- With reduced motion, snap positions and skip drops; keep opacity fades.
- Use `.get()` / `.set()` on shared values.
- Use `scheduleOnRN` from `react-native-worklets` for JS callbacks from gestures and animation completions.
