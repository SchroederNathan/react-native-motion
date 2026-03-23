# Floating Action Button - Agent Instructions

You are implementing the Floating Action Button animation from `react-native-motion`.

## Animation Specification

- **Type**: Expandable button with staggered action items
- **Library**: React Native Reanimated
- **Physics**: Staggered spring animations with configurable damping (default: 12) and stiffness (default: 180)

## Implementation Steps

1. Position the main FAB button in the corner using absolute positioning
2. Use `useSharedValue` for the open state (0 = closed, 1 = open)
3. On press, animate the open value with `withSpring`
4. Each action item uses `withDelay` + `withSpring` for staggered entry
5. Rotate the main button icon (e.g., plus to cross) using `withTiming`

## Key Code Pattern

```tsx
import Animated, { useSharedValue, withSpring, withDelay, useAnimatedStyle, interpolate } from 'react-native-reanimated'

const isOpen = useSharedValue(0)

const toggle = () => {
  isOpen.value = withSpring(isOpen.value === 0 ? 1 : 0, {
    damping: 12,
    stiffness: 180,
  })
}

// For each action item at index i:
const actionStyle = useAnimatedStyle(() => {
  const delay = i * 50
  return {
    transform: [
      { translateY: interpolate(isOpen.value, [0, 1], [0, -(i + 1) * spacing]) },
      { scale: isOpen.value },
    ],
    opacity: isOpen.value,
  }
})

const mainButtonStyle = useAnimatedStyle(() => ({
  transform: [{ rotateZ: `${interpolate(isOpen.value, [0, 1], [0, 45])}deg` }],
}))
```

## Common Pitfalls

- Use `withDelay` for stagger — don't try to offset shared values manually
- Add a backdrop/overlay that closes the FAB on press
- Use `pointerEvents` to disable interaction with action items when closed
- Apply `zIndex` carefully so the FAB renders above other content
