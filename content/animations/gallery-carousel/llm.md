# Gallery Carousel - Agent Instructions

You are implementing the Gallery Carousel animation from `react-native-motion`.

## Animation Specification

- **Type**: Horizontal scroll carousel with spring-based snapping
- **Library**: React Native Reanimated + Gesture Handler
- **Physics**: Spring animation with configurable tension (default: 200) and friction (default: 20)

## Implementation Steps

1. Create a horizontal `FlatList` or `Animated.ScrollView`
2. Use `useSharedValue` for scroll position tracking
3. Apply `withSpring` for snap-to-index behavior
4. Use `Gesture.Pan()` from Gesture Handler for swipe detection
5. Calculate snap points based on item width + gap

## Key Code Pattern

```tsx
import Animated, { useSharedValue, withSpring, useAnimatedStyle } from 'react-native-reanimated'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'

const translateX = useSharedValue(0)
const activeIndex = useSharedValue(0)

const panGesture = Gesture.Pan()
  .onEnd((e) => {
    const direction = e.velocityX > 0 ? -1 : 1
    activeIndex.value = Math.max(0, Math.min(activeIndex.value + direction, itemCount - 1))
    translateX.value = withSpring(-activeIndex.value * snapInterval, {
      damping: 20,
      stiffness: 200,
    })
  })
```

## Common Pitfalls

- Always use `runOnJS` when calling JavaScript callbacks from worklets
- Set `overflow: 'hidden'` on the container to prevent content bleed
- Use `useAnimatedReaction` to sync `activeIndex` changes back to JS thread
