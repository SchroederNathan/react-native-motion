# Radial Menu - Implementation Brief

This animation is built from three pieces:

- `OverlayProvider.tsx`
- `useRadialOverlay.ts`
- `RadialMenu.tsx`

The consumer only needs to wrap the target card with the composed gesture and provide a clone renderer.

## Required packages

```tsx
react-native-reanimated
react-native-gesture-handler
expo-blur
expo-haptics
```

## Data shape and constants

```tsx
type RadialActionDef = { id: string; icon: any; title: string }

const BUTTON_RADIUS = 28
const DEFAULT_RADIUS = 96
const DEFAULT_ANGLE_STEP_DEG = 40
const BASE_ICON_SIZE = 22
```

## Overlay provider

The overlay owns the blur, dark scrim, and lifted content layer. Keep it mounted at the app root around the screen that uses the menu.

```tsx
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView)

const blurIntensity = useSharedValue(0)
const overlayOpacity = useSharedValue(0)
const contentScale = useSharedValue(1)
const contentRotation = useSharedValue(0)

const showOverlay = useCallback((content: ReactNode) => {
  setOverlayContent(content)
  setIsVisible(true)
  overlayOpacity.set(withTiming(1, { duration: 300 }))
  blurIntensity.set(withTiming(100, { duration: 300 }))
  contentScale.set(withTiming(1.1, { duration: 300 }))
  contentRotation.set(withTiming(Math.random() * 6 - 3, { duration: 300 }))
}, [])

const hideOverlay = useCallback(() => {
  overlayOpacity.set(withTiming(0, { duration: 200 }))
  blurIntensity.set(withTiming(0, { duration: 200 }))
  contentScale.set(withTiming(1, { duration: 200 }))
  contentRotation.set(withTiming(0, { duration: 200 }))

  setTimeout(() => {
    setIsVisible(false)
    setOverlayContent(null)
  }, 200)
}, [])
```

Render structure:

```tsx
<OverlayContext.Provider value={{ showOverlay, hideOverlay }}>
  {children}
  {isVisible && (
    <>
      <Animated.View style={[StyleSheet.absoluteFillObject, overlayStyle]}>
        <AnimatedBlurView
          tint="dark"
          style={StyleSheet.absoluteFill}
          animatedProps={blurAnimatedProps}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)' }]} />
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFillObject, contentStyle]}>
        {overlayContent}
      </Animated.View>
    </>
  )}
</OverlayContext.Provider>
```

## Gesture hook

`useRadialOverlay.ts` owns the shared values and bridges from the long press into the overlay.

```tsx
const cursorX = useSharedValue(0)
const cursorY = useSharedValue(0)
const releaseSignal = useSharedValue(0)
const overlayOpen = useSharedValue(0)
const isLongPressed = useSharedValue(false)
```

Open the overlay by measuring the pressed view on the JS thread and rendering both the clone and the radial menu into the provider.

```tsx
const openOverlayAt = useCallback((pressX: number, pressY: number) => {
  targetRef.current?.measureInWindow((x, y, width, height) => {
    const clone = renderClone({ x, y, width, height })

    showOverlay(
      <View style={[StyleSheet.absoluteFill, { zIndex: 10000 }]}>
        {clone}
        <RadialMenu
          pressX={pressX}
          pressY={pressY}
          cursorX={cursorX}
          cursorY={cursorY}
          releaseSignal={releaseSignal}
          actions={actions}
          onSelect={handleSelect}
          onCancel={handleCancel}
        />
      </View>
    )

    overlayOpen.set(1)
  })
}, [actions, cursorX, cursorY, handleCancel, handleSelect, releaseSignal, renderClone, showOverlay, targetRef])
```

Use this gesture pair:

```tsx
const longPressGesture = Gesture.LongPress()
  .minDuration(500)
  .maxDistance(25)
  .onStart((event) => {
    'worklet'
    runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium)
    isLongPressed.set(true)
    cursorX.set(event.absoluteX)
    cursorY.set(event.absoluteY)
    runOnJS(openOverlayAt)(event.absoluteX, event.absoluteY)
  })
  .onFinalize(() => {
    'worklet'
    isLongPressed.set(false)
  })

const panGesture = Gesture.Pan()
  .maxPointers(1)
  .activateAfterLongPress(500)
  .onBegin((e) => {
    'worklet'
    cursorX.set(e.absoluteX)
    cursorY.set(e.absoluteY)
  })
  .onUpdate((e) => {
    'worklet'
    cursorX.set(e.absoluteX)
    cursorY.set(e.absoluteY)
  })
  .onEnd(() => {
    'worklet'
    if (overlayOpen.get() === 1) {
      releaseSignal.set(releaseSignal.get() + 1)
    }
  })
```

Return `longPressGesture`, `panGesture`, `isLongPressed`, and `overlayOpen`.

## Radial layout

The menu chooses a base angle from the press location so buttons fan away from the nearest edge.

```tsx
function lerpAngle(a: number, b: number, t: number) {
  return a + (b - a) * t
}

const baseAngleDeg = useMemo(() => {
  const cx = width / 2
  const isTopQuarter = pressY < height / 4
  const isCenterBand = Math.abs(pressX - cx) < width * 0.1

  const centerAngle = isTopQuarter ? 180 : 0
  const leftFar = isTopQuarter ? 230 : 310
  const rightFar = isTopQuarter ? 120 : 60
  const dxNorm = Math.min(1, Math.abs(pressX - cx) / (width / 2))

  let userAngle = centerAngle
  if (!isCenterBand) {
    userAngle = pressX < cx
      ? lerpAngle(centerAngle, leftFar, dxNorm)
      : lerpAngle(centerAngle, rightFar, dxNorm)
  }

  return (270 - userAngle + 360) % 360
}, [height, pressX, pressY, width])

const anglesDeg = useMemo(() => {
  const half = (actions.length - 1) / 2
  return Array.from({ length: actions.length }, (_, i) => baseAngleDeg + (i - half) * angleStepDeg)
}, [actions.length, angleStepDeg, baseAngleDeg])
```

Convert each angle into a button center:

```tsx
const toXY = (deg: number) => {
  const rad = (deg * Math.PI) / 180
  return {
    x: pressX + radius * Math.cos(rad),
    y: pressY + radius * Math.sin(rad),
  }
}
```

## Button entrance and proximity

All buttons share one entrance progress:

```tsx
const animationProgress = useSharedValue(0)

useEffect(() => {
  if (!hasAnimatedIn.current) {
    hasAnimatedIn.current = true
    animationProgress.set(withSpring(1, { damping: 80 }))
  }
}, [animationProgress])
```

Each button animates position, size, and proximity scaling. This animation intentionally uses `left`, `top`, `width`, and `height` because the button count is tiny and the hit target should grow with the visual circle.

```tsx
const animatedButtonStyle = useAnimatedStyle(() => {
  const progress = animationProgress.get()
  const startX = pressX - BUTTON_RADIUS
  const startY = pressY - BUTTON_RADIUS
  const endX = button.pos.x - BUTTON_RADIUS
  const endY = button.pos.y - BUTTON_RADIUS

  const currentX = startX + (endX - startX) * progress
  const currentY = startY + (endY - startY) * progress

  const cx = cursorX.get()
  const cy = cursorY.get()
  const dx = cx - button.pos.x
  const dy = cy - button.pos.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const normalized = Math.max(0, Math.min(1, 1 - dist / (BUTTON_RADIUS * 2)))
  const proximity = 1 + normalized * 0.4

  const vx = endX - startX
  const vy = endY - startY
  const vlen = Math.max(1, Math.sqrt(vx * vx + vy * vy))
  const closeness = Math.max(0, Math.min(1, (proximity - 1) / 0.4))
  const offset = 32 * closeness * closeness * progress

  const size = BUTTON_RADIUS * 2 * progress * proximity

  return {
    position: 'absolute',
    left: currentX + (vx / vlen) * offset,
    top: currentY + (vy / vlen) * offset,
    opacity: progress,
    width: size,
    height: size,
    borderRadius: size,
  }
})
```

The icon size follows proximity. In the demo this is bridged into React state:

```tsx
useAnimatedReaction(
  () => proximityScale.get() * BASE_ICON_SIZE,
  (size) => {
    runOnJS(setCurrentIconSize)(Math.round(size))
  }
)
```

## Hover and release

Track the nearest button center while the finger moves:

```tsx
useAnimatedReaction(
  () => ({ x: cursorX.get(), y: cursorY.get() }),
  (pos) => {
    let nearestId: string | null = null
    let nearestDist2 = Infinity
    const threshold2 = (BUTTON_RADIUS * 3) ** 2

    for (const button of buttonCenters) {
      const dx = pos.x - button.x
      const dy = pos.y - button.y
      const dist2 = dx * dx + dy * dy
      if (dist2 < nearestDist2) {
        nearestDist2 = dist2
        nearestId = button.id
      }
    }

    const active = nearestId && nearestDist2 <= threshold2 ? nearestId : null

    if (hoveredId.get() !== active) {
      hoveredId.set(active)
      if (active && lastHapticId.get() !== active) {
        lastHapticId.set(active)
        runOnJS(Haptics.selectionAsync)()
      } else if (!active) {
        lastHapticId.set(null)
      }
    }
  }
)
```

On release, either select the hovered action or cancel:

```tsx
useAnimatedReaction(
  () => releaseSignal.get(),
  (value, previous) => {
    if (previous == null || value === previous) return

    if (hoveredId.get()) {
      runOnJS(Haptics.selectionAsync)()
      runOnJS(onSelect)(hoveredId.get()!)
    } else {
      runOnJS(onCancel)()
    }
  }
)
```

## Button visuals

Each radial button renders two icon layers:

- active icon: dark on light circle
- inactive icon: white on dark circle

Toggle them by animating opacity off `hoveredId.get() === button.id`.

## Consumer usage

This is the minimal integration shape:

```tsx
const { longPressGesture, panGesture } = useRadialOverlay({
  actions,
  onSelect: handleSelect,
  onCancel: handleCancel,
  targetRef: cardRef,
  renderClone: ({ x, y, width, height }) => (
    <View style={{ position: 'absolute', top: y, left: x, width, height }}>
      {/* cloned card */}
    </View>
  ),
})

const gesture = Gesture.Simultaneous(longPressGesture, panGesture)

return (
  <GestureDetector gesture={gesture}>
    <View ref={cardRef}>{/* original card */}</View>
  </GestureDetector>
)
```

## Do not change these behaviors

- Long press duration is `500ms`.
- Pan uses `activateAfterLongPress(500)` to match the long press.
- Release is tracked with an incrementing `releaseSignal`, not a boolean.
- Use `runOnJS` for haptics, selection, cancellation, and `measureInWindow`.
- Keep entrance damping high (`80`) so buttons do not overshoot.
