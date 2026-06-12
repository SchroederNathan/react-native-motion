# Linear Tab Bar - Implementation Brief

Use this to rebuild the animation in an app codebase. Keep the implementation split across the same pieces the demo uses:

- `constants.ts`
- `TabBar.tsx`
- `TabBarPill.tsx`
- `TabIcon.tsx`
- `GlassMaterial.tsx`
- `MenuPanel.tsx`
- `SearchBar.tsx`

## Required packages

```tsx
react-native-reanimated
react-native-gesture-handler
react-native-keyboard-controller
expo-blur
expo-haptics
expo-linear-gradient
react-native-svg
@react-native-masked-view/masked-view
lucide-react-native
react-native-safe-area-context
react-native-worklets
```

## Core constants and liquid stretch

These values drive the layout and the glass deformation. Keep the same proportions or the animation will feel off.

```tsx
import { Dimensions } from 'react-native'
import { interpolate } from 'react-native-reanimated'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

export const TAB_BAR_HORIZONTAL_PADDING = 16
export const TAB_BAR_GAP = 12

export const PILL_HEIGHT = 52
export const SEARCH_ACTIVE_HEIGHT = 42
export const PILL_BORDER_RADIUS = PILL_HEIGHT / 2
export const SEARCH_ACTIVE_RADIUS = SEARCH_ACTIVE_HEIGHT / 2

export const SEARCH_BUTTON_SIZE = 52
export const TOTAL_WIDTH = SCREEN_WIDTH - 2 * TAB_BAR_HORIZONTAL_PADDING
export const PILL_WIDTH = TOTAL_WIDTH - TAB_BAR_GAP - SEARCH_BUTTON_SIZE

export const MENU_HEIGHT = 420
export const MENU_BORDER_RADIUS = 38
export const MENU_ITEM_HEIGHT = 48
export const MENU_DRAG_THRESHOLD = -50

export const ICON_PADDING = 4
export const CIRCLE_SIZE = PILL_HEIGHT - 8
export const MAX_SWITCHABLE_TAB = 2
export const TABS_START = ICON_PADDING
export const TABS_END = PILL_WIDTH - ICON_PADDING - CIRCLE_SIZE
export const TAB_ZONE_WIDTH = (TABS_END - TABS_START) / 3

export const TAB_CENTER_XS = [
  TABS_START + TAB_ZONE_WIDTH * 0.5,
  TABS_START + TAB_ZONE_WIDTH * 1.5,
  TABS_START + TAB_ZONE_WIDTH * 2.5,
  PILL_WIDTH - ICON_PADDING - CIRCLE_SIZE / 2,
] as const

export const SPRING = { damping: 24, stiffness: 170, mass: 1 } as const
export const SPRING_BOUNCY = { damping: 22, stiffness: 250, mass: 0.6 } as const
export const SPRING_MENU_OPEN = { damping: 14, stiffness: 170, mass: 0.7 } as const
export const SPRING_MENU_CLOSE = { damping: 22, stiffness: 120, mass: 0.9 } as const

const MAX_PULL = 60
const MAX_STRETCH = 0.1
const MAX_COMPRESS = 0.12

export function liquidGlassTransform(
  pressed: number,
  overflowX: number,
  overflowY: number,
  halfW: number,
  halfH: number,
) {
  'worklet'

  const pressScale = interpolate(pressed, [0, 1], [1, 1.02])

  const signX = overflowX < 0 ? -1 : 1
  const dampedX = signX * MAX_PULL * (1 - 1 / (Math.abs(overflowX) / MAX_PULL + 1))
  const signY = overflowY < 0 ? -1 : 1
  const dampedY = signY * MAX_PULL * (1 - 1 / (Math.abs(overflowY) / MAX_PULL + 1))

  const stretchX = interpolate(Math.abs(dampedX), [0, MAX_PULL], [0, MAX_STRETCH], 'clamp')
  const stretchY = interpolate(Math.abs(dampedY), [0, MAX_PULL], [0, MAX_STRETCH], 'clamp')

  const compressX = interpolate(Math.abs(dampedY), [0, MAX_PULL], [0, MAX_COMPRESS], 'clamp')
  const compressY = interpolate(Math.abs(dampedX), [0, MAX_PULL], [0, MAX_COMPRESS], 'clamp')

  return {
    transform: [
      { translateX: signX * halfW * stretchX },
      { translateY: signY * halfH * stretchY },
      { scaleX: pressScale * (1 + stretchX) * (1 - compressX) },
      { scaleY: pressScale * (1 + stretchY) * (1 - compressY) },
    ],
  }
}
```

## Main state and pill morph

`TabBar.tsx` owns two modes: search and menu. They are mutually exclusive.

```tsx
function useTabBarAnimation() {
  const searchProgress = useSharedValue(0)
  const menuProgress = useSharedValue(0)
  const [activeTab, setActiveTab] = useState(0)
  const [isSearchActive, setIsSearchActive] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleSearch = useCallback(() => {
    if (menuProgress.get() > 0.5) return
    const opening = searchProgress.get() < 0.5
    if (!opening) Keyboard.dismiss()
    searchProgress.set(withSpring(opening ? 1 : 0, SPRING))
    setIsSearchActive(opening)
  }, [menuProgress, searchProgress])

  const toggleMenu = useCallback(() => {
    if (searchProgress.get() > 0.5) return
    const opening = menuProgress.get() < 0.5
    cancelAnimation(menuProgress)
    menuProgress.set(
      withSpring(opening ? 1 : 0, opening ? SPRING_MENU_OPEN : SPRING_MENU_CLOSE)
    )
    setIsMenuOpen(opening)
  }, [menuProgress, searchProgress])

  const pillAnimatedStyle = useAnimatedStyle(() => {
    const sp = searchProgress.get()
    const mp = menuProgress.get()

    if (mp > 0.01) {
      return {
        width: PILL_WIDTH,
        height: interpolate(mp, [0, 0.1, 1], [PILL_HEIGHT, PILL_HEIGHT, MENU_HEIGHT]),
        opacity: 1,
        marginRight: TAB_BAR_GAP,
        borderRadius: interpolate(mp, [0, 0.8], [PILL_BORDER_RADIUS, MENU_BORDER_RADIUS], 'clamp'),
        transform: [
          {
            scaleX: interpolate(mp, [0, 0.15, 0.5, 0.85], [1, 0.7, 0.85, 1], 'clamp'),
          },
        ],
      }
    }

    return {
      width: interpolate(sp, [0, 0.6], [PILL_WIDTH, 0], 'clamp'),
      height: PILL_HEIGHT,
      opacity: interpolate(sp, [0, 0.3], [1, 0], 'clamp'),
      marginRight: interpolate(sp, [0, 0.6], [TAB_BAR_GAP, 0], 'clamp'),
      borderRadius: PILL_BORDER_RADIUS,
      transform: [
        { translateX: interpolate(sp, [0, 0.6], [0, -PILL_WIDTH * 0.3], 'clamp') },
      ],
    }
  })

  return {
    searchProgress,
    menuProgress,
    activeTab,
    setActiveTab,
    isSearchActive,
    isMenuOpen,
    toggleSearch,
    toggleMenu,
    pillAnimatedStyle,
  }
}
```

## Pill gestures

The pill uses `Gesture.Simultaneous(longPress, pan)`. Long press is only there to capture touch-down state immediately. The pan owns drag, hover, tab switching, and drag-to-open-menu.

```tsx
function detectAnyTab(x: number) {
  'worklet'
  if (x >= TABS_START && x < TABS_END) {
    return Math.min(MAX_SWITCHABLE_TAB, Math.floor((x - TABS_START) / TAB_ZONE_WIDTH))
  }
  if (x >= TABS_END && x <= PILL_WIDTH) return 3
  return -1
}

const pendingTab = useSharedValue(-1)

const panGesture = Gesture.Simultaneous(
  Gesture.LongPress()
    .minDuration(0)
    .onStart((e) => {
      cancelAnimation(overflowX)
      cancelAnimation(overflowY)
      cancelAnimation(glowProgress)
      touchX.set(e.x)
      touchY.set(e.y)
      pillPressed.set(withTiming(1, { duration: 80 }))
      glowProgress.set(1)
      if (searchProgress.get() < 0.5) hoveredTab.set(detectAnyTab(e.x))
    }),
  Gesture.Pan()
    .minDistance(10)
    .onStart((e) => {
      cancelAnimation(overflowX)
      cancelAnimation(overflowY)
      cancelAnimation(glowProgress)
      touchX.set(e.x)
      touchY.set(e.y)
      pillPressed.set(withTiming(1, { duration: 80 }))
      glowProgress.set(1)
    })
    .onUpdate((e) => {
      touchX.set(e.x)
      touchY.set(e.y)

      const ovX = e.x < 0 ? e.x : e.x > PILL_WIDTH ? e.x - PILL_WIDTH : 0
      const ovY = e.y < 0 ? e.y : e.y > PILL_HEIGHT ? e.y - PILL_HEIGHT : 0

      overflowX.set(ovX)
      overflowY.set(ovY)

      if (searchProgress.get() >= 0.5) return

      if (ovY < MENU_DRAG_THRESHOLD && !menuTriggeredByDrag.get() && menuProgress.get() < 0.5) {
        menuTriggeredByDrag.set(true)
        hoveredTab.set(-1)
        scheduleOnRN(toggleMenu)
        scheduleOnRN(triggerHaptic)
        overflowX.set(withSpring(0, SPRING_BOUNCY))
        overflowY.set(withSpring(0, SPRING_BOUNCY))
        pillPressed.set(withTiming(0, { duration: 150 }))
        return
      }

      if (menuTriggeredByDrag.get()) return

      if (ovX === 0 && ovY === 0) {
        const nextTab = detectAnyTab(e.x)
        if (nextTab !== hoveredTab.get()) {
          hoveredTab.set(nextTab)
          scheduleOnRN(triggerHaptic)
        }
      } else if (hoveredTab.get() !== -1) {
        hoveredTab.set(-1)
      }
    })
    .onEnd(() => {
      const wasDragMenu = menuTriggeredByDrag.get()
      menuTriggeredByDrag.set(false)

      const commitTab = hoveredTab.get()
      pillPressed.set(withTiming(0, { duration: 150 }))
      glowProgress.set(withTiming(2, { duration: 300 }))
      overflowX.set(withSpring(0, SPRING_BOUNCY))
      overflowY.set(withSpring(0, SPRING_BOUNCY))

      if (wasDragMenu || searchProgress.get() >= 0.5) {
        hoveredTab.set(-1)
        return
      }

      if (commitTab >= 0 && commitTab <= 2) {
        pendingTab.set(commitTab)
        scheduleOnRN(applyPendingTab)
        scheduleOnRN(triggerHaptic)
      } else {
        hoveredTab.set(-1)
        if (commitTab === 3) {
          scheduleOnRN(toggleMenu)
          scheduleOnRN(triggerHaptic)
        }
      }
    })
)
```

`applyPendingTab` should read `pendingTab.get()`, call `setActiveTab`, then reset it to `-1`.

## Glass surface

`GlassMaterial.tsx` is reused by the pill, search button, and close button.

- `BlurView` with `tint="dark"` and `intensity={40}`
- `LinearGradient` fill on top of the blur
- `MaskedView` for a 1px gradient border ring
- support `borderRadius` as either a number or `SharedValue<number>`

Duck-type the animated case like this:

```tsx
const isAnimated = typeof borderRadius === 'object' && 'get' in borderRadius
```

## Tab icons

Each tab icon owns its tap gesture. That gesture only sets touch state and delegates the actual selection.

- On `onBegin`: set `touchX`, `touchY`, `pillPressed`, and `glowProgress`
- On `onFinalize`: reset the press state, animate glow `1 -> 2`, clear hover, then `scheduleOnRN(triggerHaptic)` and `scheduleOnRN(handlePress)`
- When `menuProgress > 0`, every icon translates toward the pill center and scales down
- When `searchProgress > 0`, tabs `1..3` fade out and collapse; tab `0` stays visible
- Tab `3` is circular and uses its own pressed state to keep its hover background visible

## Menu panel

`MenuPanel.tsx` should animate the header, divider, and seven items with separate progress values.

```tsx
const STAGGER_IN_MS = 40
const STAGGER_OUT_MS = 10
const ITEM_IN_DURATION = 250
const ITEM_OUT_DURATION = 80

useAnimatedReaction(
  () => menuProgress.get(),
  (current, previous) => {
    const prev = previous ?? 0
    const goingUp = current > prev

    if (goingUp && current > 0.1 && !wasOpen.get()) {
      wasOpen.set(true)
      headerProgress.set(withDelay(0, withTiming(1, { duration: ITEM_IN_DURATION })))
      dividerProgress.set(withDelay(40, withTiming(1, { duration: ITEM_IN_DURATION })))
      // itemProgresses[0..6] with 40ms stagger
    } else if (!goingUp && current < 0.95 && wasOpen.get()) {
      wasOpen.set(false)
      // reverse the item order with 10ms stagger
    }
  }
)
```

Each item animates `opacity` and `translateY` from `-10` to `0`.

## Search and close buttons

Both buttons use `Gesture.Race(pan, tap)`.

- `tap`: handles toggle + haptic
- `pan`: only exists for the liquid stretch and glow

Shared glow component:

```tsx
export function GlowOverlay({ size, id, touchX, touchY, glowProgress }) {
  const half = size / 2

  const glowStyle = useAnimatedStyle(() => {
    const progress = glowProgress.get()
    const opacity = progress <= 1
      ? progress * 0.2
      : interpolate(progress, [1, 2], [0.2, 0], 'clamp')
    const scale = progress <= 1
      ? 1
      : interpolate(progress, [1, 2], [1, 4], 'clamp')

    return {
      opacity,
      transform: [
        { translateX: touchX.get() - half },
        { translateY: touchY.get() - half },
        { scale },
      ],
    }
  })

  return <Animated.View style={glowStyle}>{/* radial SVG */}</Animated.View>
}
```

`SearchButton` specifics:

- outer size starts at `52`
- height animates from `52` to `42`
- icon moves from centered to `left: 16`
- input opacity fades in over `searchProgress` `[0.4, 0.8]`
- focus the `TextInput` from `useEffect` when `isSearchActive` becomes true

`CloseSearchButton` specifics:

- opacity ramps in over `[0.3, 0.6]`
- width grows from `0` to `42`
- margin-left grows from `0` to `TAB_BAR_GAP`
- translateX and scale animate in together

## Final render tree

`TabBar.tsx` should render:

1. An absolutely positioned bottom row using `useSafeAreaInsets()`
2. `TabBarPill`
3. `SearchButton`
4. `CloseSearchButton`
5. An `absoluteFill` `Pressable` backdrop when the menu is open

Also translate the whole bar with `useReanimatedKeyboardAnimation()` so search stays visible above the keyboard.

## Do not change these behaviors

- Keep search and menu mutually exclusive.
- Keep the pill squeeze curve `[0, 0.15, 0.5, 0.85] -> [1, 0.7, 0.85, 1]`.
- Keep the menu drag threshold at `-50`.
- Use `.get()` / `.set()` on shared values.
- Use `scheduleOnRN` for JS callbacks from gesture handlers.
- Cancel running animations before starting new press or glow animations.
