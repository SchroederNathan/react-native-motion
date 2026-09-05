# Stack Toast - Implementation Brief

This animation is two pieces:

- `ToastProvider.tsx`
- `Toast.tsx`

The consumer wraps the app in `ToastProvider` and calls `showToast({ message })` from the `useToast` hook. Toasts stack against the bottom of the screen by default. `ToastProvider` takes a `position` prop (`'top' | 'bottom'`) that picks the edge for the stack, and each `showToast` call can pass its own `position` to override it. The two edges are independent stacks.

## Required packages

```tsx
react-native-reanimated
react-native-gesture-handler
react-native-worklets
expo-haptics
react-native-safe-area-context
@expo/vector-icons
```

## Data shapes and constants

```tsx
export type ToastPosition = 'top' | 'bottom'

export interface ToastConfig {
  id: number
  message: string
  position: ToastPosition
  actionText?: string
  onActionPress?: () => void
}

export interface ToastOptions {
  message: string
  position?: ToastPosition // defaults to the provider's position
  actionText?: string
  onActionPress?: () => void
}

interface ToastEntry extends ToastConfig {
  exiting?: boolean // exit animation running; no longer occupies a stack slot
}

const ENTER_OFFSET = 200      // entrance travel, clears the anchored screen edge
const HIDDEN_SCALE = 0.7
const AUTO_DISMISS_MS = 3000
const FADE_IN_MS = 200
const EXIT_MS = 160
const EXIT_DROP = 40          // front-toast slide toward its edge on close/timeout
const SWIPE_EXIT_DROP = 80    // extra travel a swipe keeps after release
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1)
const DISMISS_DISTANCE = 56   // drag distance that commits a dismiss
const DISMISS_VELOCITY = 800  // flick velocity that commits a dismiss

const STACK_PEEK = 14         // each toast behind peeks out this much, measured from the front toast's far edge
const STACK_SCALE_STEP = 0.05 // and shrinks this much per step
const MAX_VISIBLE = 3         // deeper entries fade out
```

## Provider and stack index

The provider owns the toast array and a map of measured heights by id. Ids come from a ref counter and only grow. Oldest renders first so newer toasts sit on top without animated zIndex. The provider's `position` prop (default `'bottom'`) is stamped onto each entry unless the `showToast` call sets its own.

```tsx
export function ToastProvider({
  children,
  position = 'bottom',
}: {
  children: ReactNode
  position?: ToastPosition
}) {
  const [toasts, setToasts] = useState<ToastEntry[]>([])
  const [heights, setHeights] = useState<Record<number, number>>({})
  const nextId = useRef(1)

  const showToast = useCallback(
    (options: ToastOptions) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setToasts((current) => [
        ...current,
        {
          id: nextId.current++,
          ...options,
          position: options.position ?? position,
        },
      ])
    },
    [position],
  )

const handleDismissStart = useCallback((id: number) => {
  setToasts((current) =>
    current.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
  )
}, [])

const handleDismissed = useCallback((id: number) => {
  setToasts((current) => current.filter((t) => t.id !== id))
  setHeights((current) => {
    const next = { ...current }
    delete next[id]
    return next
  })
}, [])

const handleHeightChange = useCallback((id: number, height: number) => {
  setHeights((current) =>
    current[id] === height ? current : { ...current, [id]: height },
  )
}, [])
```

Each edge is its own stack. A toast's stack index is the count of non-exiting newer entries on the same edge. Index 0 is the front. That stack's front toast's measured height is the baseline the rest of the stack peeks beyond.

```tsx
const frontHeightFor = (edge: ToastPosition) => {
  const active = toasts.filter((t) => !t.exiting && t.position === edge)
  return active.length ? heights[active[active.length - 1].id] : undefined
}
const frontHeights: Record<ToastPosition, number | undefined> = {
  top: frontHeightFor('top'),
  bottom: frontHeightFor('bottom'),
}

{toasts.map((toast) => (
  <Toast
    key={toast.id}
    toast={toast}
    index={
      toasts.filter(
        (t) => !t.exiting && t.position === toast.position && t.id > toast.id,
      ).length
    }
    height={heights[toast.id]}
    frontHeight={frontHeights[toast.position]}
    onHeightChange={handleHeightChange}
    onDismissStart={handleDismissStart}
    onDismissed={handleDismissed}
  />
))}
```

A dismissing toast flips `exiting` immediately (`onDismissStart`), so the toasts behind spring forward while it fades. It is removed from state only after the fade (`onDismissed`).

## Entrance and stack layout

Each toast owns five shared values and one direction sign. `dir` is `+1` for a bottom toast (toward the edge is down) and `-1` for a top toast (toward the edge is up). Every vertical motion is multiplied by it, so one sign mirrors the whole animation. `progress` is entrance-only; the exit is a slide-out fade, not the spring reversed.

```tsx
const dir = toast.position === 'top' ? -1 : 1

const progress = useSharedValue(0) // 0 = past the edge, 1 = resting
const opacity = useSharedValue(0)
const dragY = useSharedValue(0)
const stackY = useSharedValue(0) // new toasts always enter at the front
const stackScale = useSharedValue(1 - index * STACK_SCALE_STEP)
```

The toast reports its layout height to the provider from `onLayout` on the animated container:

```tsx
onLayout={(e) => onHeightChange(toast.id, e.nativeEvent.layout.height)}
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

Follow the stack when the index or a height shifts. Every toast is anchored to the same screen edge and scales about its own center, so the offset that lines a toast's far edge up `STACK_PEEK` per slot beyond the front toast's far edge depends on both heights. `stackOffset` is written for a bottom stack; a top stack is the mirror image, so the result is multiplied by `dir`. The offset waits until this toast and the front one are both measured. Entries past `MAX_VISIBLE` fade instead of poking out of the far side.

```tsx
function stackOffset(index: number, height: number, frontHeight: number) {
  const scale = 1 - index * STACK_SCALE_STEP
  return -frontHeight + (height * (1 + scale)) / 2 - index * STACK_PEEK
}

useEffect(() => {
  if (exitingRef.current) return
  const scale = 1 - index * STACK_SCALE_STEP
  stackScale.set(reduced ? scale : withSpring(scale))
  if (height !== undefined && frontHeight !== undefined) {
    const y = dir * stackOffset(index, height, frontHeight)
    stackY.set(reduced ? y : withSpring(y))
  }
  if (index >= MAX_VISIBLE) {
    opacity.set(withTiming(0, { duration: FADE_IN_MS }))
  }
}, [dir, frontHeight, height, index, opacity, reduced, stackScale, stackY])
```

One animated style combines entrance, stack position, and drag:

```tsx
const animatedStyle = useAnimatedStyle(() => {
  const p = progress.get()
  return {
    opacity: opacity.get(),
    transform: [
      { translateY: (1 - p) * ENTER_OFFSET * dir + stackY.get() + dragY.get() },
      { scale: (HIDDEN_SCALE + (1 - HIDDEN_SCALE) * p) * stackScale.get() },
    ],
  }
})
```

The container is absolutely positioned with `left: 16`, `right: 16`, and a static `zIndex: 100`. A bottom toast sets `bottom: insets.bottom + 16`; a top toast sets `top: insets.top + 16` instead.

## Drag gesture

Drags away from the edge resist toward a ~40px asymptote. Drags toward the edge follow the finger raw. Translation and velocity are multiplied by `dir` so the same thresholds work for both edges.

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
    const toward = e.translationY * dir
    dragY.set(dir * (toward >= 0 ? toward : -rubberBand(-toward)))
  })
  .onEnd((e) => {
    if (e.translationY * dir > DISMISS_DISTANCE || e.velocityY * dir > DISMISS_VELOCITY) {
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

One `dismiss(kind)` handles timeout, close button, and swipe. An `exitingRef` guards against races between them. The fade is a timing animation; the slide toward the edge depends on the kind and is multiplied by `dir`.

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
        withTiming(dragY.get() + dir * SWIPE_EXIT_DROP, {
          duration: EXIT_MS,
          easing: EASE_OUT,
        }),
      )
    } else if (indexRef.current === 0) {
      dragY.set(withTiming(dir * EXIT_DROP, { duration: EXIT_MS, easing: EASE_OUT }))
    }
    // a toast expiring behind the front just fades where it sits
  },
  [clearTimer, dir, dragY, finishDismiss, onDismissStart, opacity, reduced, toast.id],
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

A dark rounded row: leading checkmark icon, `numberOfLines={3}` message (toasts run one to three lines tall), optional uppercase action button (calls `onActionPress` then `dismiss('close')`), and a close icon button. Both pressables use `hitSlop={8}`.

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
showToast({ message: 'Reminder set', position: 'top' })
showToast({
  message: 'Link copied',
  actionText: 'Undo',
  onActionPress: handleUndo,
})
```

Wrap the screen in `ToastProvider` (and `SafeAreaProvider` if the app does not already have one). Pass `position="top"` to the provider to stack every toast at the top by default.

## Do not change these behaviors

- Stack index = count of non-exiting entries on the same edge with a higher id, not array position. `frontHeight` also comes from the same edge.
- `position` defaults to `'bottom'`; the provider prop sets the default and each `showToast` call can override it.
- Every vertical motion (entrance offset, stack offset, drag, exit drops) is multiplied by `dir`. Do not add a second code path for the top edge.
- Stack offsets come from measured heights via `stackOffset`, so toasts of different heights peek evenly above the front toast's top edge. Wait for both `height` and `frontHeight` before setting the first offset.
- `onDismissStart` fires at the start of the exit; removal waits for the fade.
- Drag away from the edge goes through `rubberBand`; drag toward the edge is raw.
- Dismiss commits on distance (`56`) OR velocity (`800`).
- Pan is enabled only on the front toast (`index === 0`).
- Timer clears in `onBegin` and restarts on every non-dismissing gesture end, including failed gestures in `onFinalize`.
- Exit is `withTiming` (160ms, ease-out bezier), never the entrance spring reversed.
- Use `withSpring` with the default config, target value only.
- With reduced motion, snap positions and skip drops; keep opacity fades.
- Use `.get()` / `.set()` on shared values.
- Use `scheduleOnRN` from `react-native-worklets` for JS callbacks from gestures and animation completions.
