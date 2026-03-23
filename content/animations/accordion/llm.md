# Accordion - Agent Instructions

You are implementing the Accordion animation from `react-native-motion`.

## Animation Specification

- **Type**: Expandable/collapsible sections with animated height
- **Library**: React Native Reanimated
- **Physics**: Spring animation with configurable damping (default: 15) and stiffness (default: 120)

## Implementation Steps

1. Measure each section's content height using `onLayout` and store in a shared value
2. Use `useSharedValue` for each section's open/closed state (0 or 1)
3. Animate height between 0 and measured height with `withSpring`
4. Rotate the chevron indicator with `withTiming` (0° closed, 180° open)
5. Set `overflow: 'hidden'` on the content container

## Key Code Pattern

```tsx
import Animated, { useSharedValue, withSpring, useAnimatedStyle } from 'react-native-reanimated'

const contentHeight = useSharedValue(0)
const isOpen = useSharedValue(0)

const animatedStyle = useAnimatedStyle(() => ({
  height: interpolate(isOpen.value, [0, 1], [0, contentHeight.value]),
  overflow: 'hidden',
}))

const chevronStyle = useAnimatedStyle(() => ({
  transform: [{ rotateZ: `${interpolate(isOpen.value, [0, 1], [0, 180])}deg` }],
}))

const toggle = () => {
  isOpen.value = withSpring(isOpen.value === 0 ? 1 : 0, {
    damping: 15,
    stiffness: 120,
  })
}
```

## Common Pitfalls

- Measure content height with `onLayout` on an invisible wrapper first, not the animated container
- Use `overflow: 'hidden'` to clip content during collapse
- When `allowMultiple` is false, close other sections before opening the new one
- Avoid re-measuring height on every render — cache the measured value
