# Flip Card - Agent Instructions

You are implementing the Flip Card animation from `react-native-motion`.

## Animation Specification

- **Type**: 3D Y-axis rotation toggling between two card faces
- **Library**: React Native Reanimated
- **Physics**: Timing animation with easing (default duration: 600ms)

## Implementation Steps

1. Create two absolutely positioned views for front and back faces
2. Use `useSharedValue` for the rotation progress (0 = front, 1 = back)
3. Animate the shared value with `withTiming` on press
4. Apply `rotateY` via `useAnimatedStyle` — front rotates 0° to 180°, back rotates 180° to 360°
5. Set `backfaceVisibility: 'hidden'` on both faces

## Key Code Pattern

```tsx
import Animated, { useSharedValue, withTiming, useAnimatedStyle, interpolate } from 'react-native-reanimated'

const rotation = useSharedValue(0)

const frontStyle = useAnimatedStyle(() => ({
  transform: [{ rotateY: `${interpolate(rotation.value, [0, 1], [0, 180])}deg` }],
  backfaceVisibility: 'hidden',
}))

const backStyle = useAnimatedStyle(() => ({
  transform: [{ rotateY: `${interpolate(rotation.value, [0, 1], [180, 360])}deg` }],
  backfaceVisibility: 'hidden',
}))

const handleFlip = () => {
  rotation.value = withTiming(rotation.value === 0 ? 1 : 0, { duration: 600 })
}
```

## Common Pitfalls

- Both faces must have `backfaceVisibility: 'hidden'` or the back face shows through
- Apply `perspective` to the container for a realistic 3D effect (e.g., `perspective: 1000`)
- The back face content needs an initial `rotateY: 180deg` so it reads correctly when flipped
