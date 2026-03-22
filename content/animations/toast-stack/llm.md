# Toast Stack - Agent Instructions

You are implementing the Toast Stack animation from `react-native-motion`.

## Animation Specification

- **Type**: Stacked notification toasts with enter/exit animations
- **Library**: React Native Reanimated + Gesture Handler
- **Enter**: Slide in from top with spring, scale from 0.95 to 1
- **Exit**: Swipe horizontal with opacity fade, or auto-dismiss with slide up

## Implementation Steps

1. Create a `ToastProvider` context with a toast queue
2. Render toasts in an absolute-positioned container
3. Each toast uses `useSharedValue` for translateY, translateX, scale, opacity
4. Enter animation: `withSpring` for translateY and scale
5. Exit animation: `withTiming` for opacity and translateX on swipe
6. Stack effect: offset each toast by index * 8px, scale by 1 - index * 0.05

## Key Code Pattern

```tsx
const entering = () => {
  'worklet'
  return {
    initialValues: { translateY: -100, scale: 0.95, opacity: 0 },
    animations: {
      translateY: withSpring(0, { damping: 20, stiffness: 200 }),
      scale: withSpring(1),
      opacity: withTiming(1, { duration: 200 }),
    },
  }
}
```

## Common Pitfalls

- Use `layout` animations for smooth reordering when a toast is dismissed from the middle
- Set `pointerEvents="box-none"` on the container so touches pass through to content below
- Use `cancelAnimation` before starting a new animation on the same shared value
