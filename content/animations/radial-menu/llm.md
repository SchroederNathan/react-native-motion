# Radial Menu — Agent Instructions

You are implementing the Radial Menu animation from `react-native-motion`. This is a three-part animation: a long-press gesture system, a radial action menu with proximity-based scaling, and a blur overlay with card cloning.

## Animation Specification

- **Type**: Long-press radial action menu with adaptive positioning
- **Libraries**: React Native Reanimated, React Native Gesture Handler, expo-blur, expo-haptics, expo-image
- **Button entrance**: Spring with damping 80 (quick settle, no bounce)
- **Blur transition**: Timing-based opacity (300ms in, 200ms out)
- **Proximity scaling**: Continuous 1.0–1.4 based on finger distance
- **Layout**: Small fixed set of buttons (3–5), all absolutely positioned — no virtualization needed
- **API conventions**: Use `.get()`/`.set()` on shared values (not `.value`) for React Compiler compatibility. Use `scheduleOnRN` from `react-native-worklets` instead of `runOnJS`.

## Types and Constants

```tsx
import Animated, {
  useAnimatedStyle,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
  useAnimatedProps,
  runOnJS,
  SharedValue,
} from 'react-native-reanimated'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import * as Haptics from 'expo-haptics'
import { BlurView } from 'expo-blur'

type RadialActionDef = { id: string; icon: any; title: string }

const BUTTON_RADIUS = 28          // 56px diameter
const DEFAULT_RADIUS = 96          // press point to button center
const DEFAULT_ANGLE_STEP_DEG = 40  // angular spread between buttons
const BASE_ICON_SIZE = 22
```

## Implementation Steps

### Step 1: OverlayProvider — blur backdrop and content layer

Create a context provider that manages overlay visibility. It controls:
- `blurIntensity` shared value animated with `withTiming(100, { duration: 300 })` on show, `withTiming(0, { duration: 200 })` on hide
- `overlayOpacity` shared value for the dark scrim layer
- `contentScale` animated to 1.1 and `contentRotation` to a random -3 to +3 degrees for the card "lift" effect
- Use `Animated.createAnimatedComponent(BlurView)` with `useAnimatedProps` to animate blur intensity without re-renders

Render structure:
```tsx
<OverlayContext.Provider value={{ showOverlay, hideOverlay }}>
  {children}
  {isVisible && (
    <>
      {/* Blur: z-index 9998 */}
      <Animated.View style={[StyleSheet.absoluteFillObject, overlayStyle]}>
        <AnimatedBlurView tint="dark" style={StyleSheet.absoluteFill} animatedProps={blurAnimatedProps} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)' }]} />
      </Animated.View>
      {/* Content: z-index 9999 */}
      <Animated.View style={[StyleSheet.absoluteFillObject, contentStyle]}>
        {overlayContent}
      </Animated.View>
    </>
  )}
</OverlayContext.Provider>
```

Use `setTimeout(hideDelay, 200)` after starting the hide animation to remove content from the tree.

### Step 2: useRadialOverlay — gesture composition

Create a hook that returns `longPressGesture` and `panGesture` for the consumer to compose.

**Shared values:**
```tsx
const cursorX = useSharedValue(0)
const cursorY = useSharedValue(0)
const releaseSignal = useSharedValue(0)
const overlayOpen = useSharedValue(0)
const isLongPressed = useSharedValue(false)
```

**Long press gesture:**
- `Gesture.LongPress().minDuration(500).maxDistance(25)`
- `onStart`: fire `Haptics.impactAsync(Medium)` via `runOnJS`, set `isLongPressed`, record cursor position, call `openOverlayAt` via `runOnJS`
- `onFinalize`: reset `isLongPressed`

**Pan gesture:**
- `Gesture.Pan().maxPointers(1).activateAfterLongPress(500)`
- `onBegin`/`onUpdate`: set `cursorX`/`cursorY` from `e.absoluteX`/`e.absoluteY`
- `onEnd`: if `overlayOpen.value === 1`, increment `releaseSignal`

**Opening the overlay:**
```tsx
const openOverlayAt = useCallback((pressX, pressY) => {
  targetRef.current?.measureInWindow((x, y, width, height) => {
    const clone = renderClone({ x, y, width, height })
    showOverlay(
      <View style={[StyleSheet.absoluteFill, { zIndex: 10000 }]}>
        {clone}
        <RadialMenu
          pressX={pressX} pressY={pressY}
          cursorX={cursorX} cursorY={cursorY}
          releaseSignal={releaseSignal}
          actions={actions}
          onSelect={handleSelect}
          onCancel={handleCancel}
        />
      </View>
    )
    overlayOpen.value = 1
  })
}, [deps])
```

Consumer composes gestures: `Gesture.Simultaneous(Gesture.Race(longPress, tap), pan)`

### Step 3: RadialMenu — adaptive angle calculation

Compute the base angle from press position so buttons always fan away from the nearest edge:

- If press is in top quarter: buttons fan downward (user-space 180°)
- If press is in bottom three-quarters: buttons fan upward (user-space 0°)
- Left/right offset lerps toward diagonal angles based on horizontal distance from center
- Convert from user-space (0° = up, CCW+) to RN coordinates (0° = right, CW+): `rnAngle = (270 - userAngle + 360) % 360`

Distribute actions around the base angle:
```tsx
const half = (count - 1) / 2
const angles = Array.from({ length: count }, (_, i) =>
  baseAngleDeg + (i - half) * angleStepDeg
)
```

Convert angles to positions:
```tsx
const toXY = (deg) => ({
  x: pressX + radius * Math.cos(deg * Math.PI / 180),
  y: pressY + radius * Math.sin(deg * Math.PI / 180),
})
```

### Step 4: Button entrance and proximity animation

Animate all buttons with a single `animationProgress` shared value: `withSpring(1, { damping: 80 })`.

Each button's `useAnimatedStyle`:

1. **Position**: Interpolate from press point to final position using `progress`
2. **Proximity scale**: Compute distance from cursor to button center. Within `BUTTON_RADIUS * 2`, scale from 1.0 to 1.4
3. **Combined scale**: `progress * proximity`
4. **Nudge offset**: Push button along its radial axis proportional to `closeness²` (quadratic ease), max 32px
5. **Size**: `BUTTON_RADIUS * 2 * combinedScale` for both width and height

```tsx
const animatedButtonStyle = useAnimatedStyle(() => {
  const progress = animationProgress.value
  const startX = pressX - BUTTON_RADIUS
  const startY = pressY - BUTTON_RADIUS
  const endX = button.pos.x - BUTTON_RADIUS
  const endY = button.pos.y - BUTTON_RADIUS

  const currentX = startX + (endX - startX) * progress
  const currentY = startY + (endY - startY) * progress

  const cx = cursorX?.value ?? pressX
  const cy = cursorY?.value ?? pressY
  const dx = cx - button.pos.x
  const dy = cy - button.pos.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const normalized = Math.max(0, Math.min(1, 1 - dist / (BUTTON_RADIUS * 2)))
  const proximity = 1 + normalized * 0.4
  const scale = progress * proximity
  const opacity = progress

  // Nudge along radial axis
  const vx = endX - startX
  const vy = endY - startY
  const vlen = Math.max(1, Math.sqrt(vx * vx + vy * vy))
  const closeness = Math.max(0, Math.min(1, (proximity - 1) / 0.4))
  const offset = 32 * closeness * closeness * progress
  const adjX = currentX + (vx / vlen) * offset
  const adjY = currentY + (vy / vlen) * offset

  const baseSize = BUTTON_RADIUS * 2
  return {
    left: adjX,
    top: adjY,
    opacity,
    width: baseSize * scale,
    height: baseSize * scale,
  }
})
```

### Step 5: Hover detection and haptics

Use `useAnimatedReaction` watching `{ x: cursorX.value, y: cursorY.value }`. Find the nearest button center within `(BUTTON_RADIUS * 3)²` distance. Update `hoveredId` shared value.

Fire `Haptics.selectionAsync()` via `runOnJS` only when entering a new button (guard with `lastHapticId`). Clear `lastHapticId` when leaving all buttons.

### Step 6: Release signal reaction

```tsx
useAnimatedReaction(
  () => releaseSignal ? releaseSignal.value : -1,
  (val, prev) => {
    if (val === -1 || prev == null || val === prev) return
    if (hoveredId.value) {
      runOnJS(Haptics.selectionAsync)()
      runOnJS(onSelect)(hoveredId.value)
    } else {
      runOnJS(onCancel)()
    }
  }
)
```

### Step 7: Icon color toggle

Render two icon layers per button — active (dark color on theme background) and inactive (white on dark). Toggle opacity based on `hoveredId.value === button.id`.

Use `useDerivedValue` for dynamic icon size tracking proximity scale, bridged to React state via `useAnimatedReaction` + `runOnJS(setCurrentIconSize)`.

### Step 8: Floating label

Show the hovered action's title on the opposite horizontal side of the press point. Clamp vertical position within top two-thirds of screen, within 160px of press Y.

### Step 9: Consumer integration

```tsx
const actions = useMemo(() => [
  { id: 'star', icon: StarIcon, title: 'Favorite' },
  { id: 'bookmark', icon: BookmarkIcon, title: 'Save' },
  { id: 'share', icon: ShareIcon, title: 'Share' },
], [])

const { longPressGesture, panGesture, isLongPressed, overlayOpen } = useRadialOverlay({
  actions,
  onSelect: handleSelect,
  onCancel: handleCancel,
  targetRef: cardRef,
  renderClone: ({ x, y, width, height }) => (
    <View style={{ position: 'absolute', top: y, left: x, width, height }}>
      {/* Card content clone */}
    </View>
  ),
})

// Add press scale feedback
const scale = useSharedValue(1)
const longPressWithScale = longPressGesture
  .onBegin(() => { 'worklet'; scale.value = withSpring(0.98) })
  .onFinalize(() => { 'worklet'; if (overlayOpen.value === 0) scale.value = withSpring(1) })

const composedGesture = Gesture.Simultaneous(
  Gesture.Race(longPressWithScale, tapGesture),
  panGesture
)
```

## Key Code Patterns

### The release signal pattern
Instead of checking hover state on gesture end (which requires bridging), increment a shared value. The menu watches it with `useAnimatedReaction` and reads `hoveredId` on the UI thread — no bridge round-trip needed for the selection check.

### Adaptive angle placement
The menu always fans away from the nearest screen edge. The angle calculation uses a user-space convention (0° = up, CCW+) then converts to RN coordinates. This keeps the API intuitive while handling the coordinate system difference.

### Proximity scaling with nudge
The proximity effect has two parts: scale (1.0–1.4) makes the button grow, and the nudge (0–32px along the radial axis) pushes it away from center. The nudge uses quadratic easing (`closeness²`) so it accelerates as the finger gets closer, creating a magnetic repulsion feel.

## Common Pitfalls

- **Use `Gesture.Simultaneous()` for long press + pan.** `Gesture.Race()` kills the loser — the pan would die when the long press ends.
- **`activateAfterLongPress` on pan must match long press `minDuration`.** Mismatched values break scroll or miss finger tracking.
- **Increment `releaseSignal`, don't toggle.** Boolean toggles can miss changes in `useAnimatedReaction`.
- **Guard haptics with `lastHapticId`.** Without it, haptics fire every frame during hover.
- **`measureInWindow` is JS-only.** Bridge from the worklet with `runOnJS` before calling it.
- **`AnimatedBlurView` must use `useAnimatedProps`, not animated style.** The `intensity` prop isn't a style property.
- **Button size is animated via `width`/`height` (layout properties).** This is intentional — `transform: [{ scale }]` doesn't affect hit areas. Acceptable because button count is small (3–5) and the menu is short-lived.
- **Only animate `transform` and `opacity`** for other elements — these run on the GPU. The button `width`/`height` animation is the deliberate exception.
- **Use `scheduleOnRN` from `react-native-worklets`** instead of the deprecated `runOnJS` when calling JS callbacks from gesture handlers.
- **Use `.get()` and `.set()` on shared values** instead of `.value` for React Compiler compatibility.
- **Use `Gesture.Tap()` instead of `Pressable`** for the card's press scale animation — keeps it on the UI thread.
