# Swipe to Delete - Agent Instructions

You are implementing the Swipe to Delete animation from `react-native-motion`.

## Animation Specification

- **Type**: Horizontal swipe gesture revealing a delete action behind a list row
- **Library**: React Native Reanimated + Gesture Handler
- **Physics**: Spring animation with configurable damping (default: 20) and stiffness (default: 200)

## Implementation Steps

1. Create a container with the delete action positioned absolutely behind the row content
2. Use `Gesture.Pan()` to track horizontal drag on the row
3. Clamp translation so the row only moves left (negative direction)
4. On release, snap open if past threshold or velocity is high enough, otherwise snap back
5. When snapped open, a tap on the delete button triggers `onDelete`

## Key Code Pattern

```tsx
import Animated, { useSharedValue, withSpring, useAnimatedStyle, interpolate } from 'react-native-reanimated'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'

const translateX = useSharedValue(0)

const panGesture = Gesture.Pan()
  .onUpdate((e) => {
    translateX.value = Math.min(0, e.translationX)
  })
  .onEnd((e) => {
    const shouldOpen = Math.abs(translateX.value) > threshold || Math.abs(e.velocityX) > 500
    translateX.value = withSpring(shouldOpen ? -deleteWidth : 0, {
      damping: 20,
      stiffness: 200,
    })
  })
```

## Common Pitfalls

- Use `runOnJS` when calling the `onDelete` callback from the UI thread
- Prevent vertical scroll interference by setting `activeOffsetX` on the pan gesture
- Use `interpolate` to scale the delete icon as the row is swiped open
