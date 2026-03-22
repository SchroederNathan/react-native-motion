# Spring Modal - Agent Instructions

You are implementing the Spring Modal animation from `react-native-motion`.

## Animation Specification

- **Type**: Modal overlay with spring open/close
- **Library**: React Native Reanimated
- **Open**: Backdrop fades in (withTiming), content scales from 0.9→1 and translates from 20→0 (withSpring)
- **Close**: Reverse with faster timing

## Implementation Steps

1. Use `useSharedValue` for `progress` (0 = closed, 1 = open)
2. Animate progress with `withSpring` on open, `withTiming` on close
3. Backdrop opacity = `interpolate(progress, [0, 1], [0, backdropOpacity])`
4. Content transform: scale and translateY derived from progress
5. Handle back button / gesture to close

## Key Code Pattern

```tsx
const progress = useSharedValue(0)

useEffect(() => {
  progress.value = visible
    ? withSpring(1, { damping: 20, stiffness: 300 })
    : withTiming(0, { duration: 200 })
}, [visible])

const backdropStyle = useAnimatedStyle(() => ({
  opacity: interpolate(progress.value, [0, 1], [0, 0.5]),
}))

const contentStyle = useAnimatedStyle(() => ({
  transform: [
    { scale: interpolate(progress.value, [0, 1], [0.9, 1]) },
    { translateY: interpolate(progress.value, [0, 1], [20, 0]) },
  ],
  opacity: progress.value,
}))
```

## Common Pitfalls

- Unmount content after close animation completes using `runOnJS` callback
- Use `Pressable` with `onPress` for backdrop tap, not `TouchableWithoutFeedback`
- Set `pointerEvents={visible ? 'auto' : 'none'}` to prevent phantom touches
