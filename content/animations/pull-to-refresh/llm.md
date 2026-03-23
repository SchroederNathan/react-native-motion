# Pull to Refresh - Agent Instructions

You are implementing the Pull to Refresh animation from `react-native-motion`.

## Animation Specification

- **Type**: Custom pull-to-refresh with animated indicator
- **Library**: React Native Reanimated + Gesture Handler
- **Physics**: Spring animation with configurable damping (default: 15) and stiffness (default: 150)

## Implementation Steps

1. Wrap children in a `GestureDetector` with a vertical `Pan` gesture
2. Track pull distance with `useSharedValue`
3. Apply rubber-band effect when pulling beyond threshold (diminishing returns on distance)
4. On release past threshold, snap indicator to resting position and call `onRefresh`
5. On refresh complete, spring the indicator back to hidden

## Key Code Pattern

```tsx
import Animated, { useSharedValue, withSpring, useAnimatedStyle, interpolate, runOnJS } from 'react-native-reanimated'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'

const pullDistance = useSharedValue(0)
const isRefreshing = useSharedValue(false)

const panGesture = Gesture.Pan()
  .onUpdate((e) => {
    if (!isRefreshing.value) {
      pullDistance.value = Math.max(0, e.translationY * 0.5) // rubber band
    }
  })
  .onEnd(() => {
    if (pullDistance.value > threshold) {
      isRefreshing.value = true
      pullDistance.value = withSpring(threshold)
      runOnJS(handleRefresh)()
    } else {
      pullDistance.value = withSpring(0)
    }
  })
```

## Common Pitfalls

- Use `runOnJS` for the async `onRefresh` callback
- Apply a rubber-band multiplier (e.g., 0.5) to prevent the pull from feeling too loose
- Disable the pan gesture while refreshing to prevent double-triggers
- Use `useAnimatedReaction` to watch for refresh completion and animate back
