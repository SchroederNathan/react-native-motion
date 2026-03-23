# Gallery Stack Carousel - Agent Instructions

You are implementing the Gallery Stack Carousel animation from `react-native-motion`. This is a two-part animation: a stacked card carousel with a stack-to-carousel blend, and a blurred backdrop that crossfades between images.

## Animation Specification

- **Type**: Stacked card carousel with blurred backdrop crossfade
- **Libraries**: React Native Reanimated, React Native Gesture Handler, react-native-worklets, expo-blur, expo-image, expo-linear-gradient, @react-native-masked-view/masked-view
- **Carousel physics**: Spring snapping with velocity projection
- **Backdrop physics**: Timing-based opacity crossfade (500ms)
- **Layout**: All cards rendered simultaneously via `.map()` with `position: 'absolute'` — no list virtualization (card count is small and all are visible)
- **API conventions**: Use `.get()`/`.set()` on shared values (not `.value`) for React Compiler compatibility. Use `scheduleOnRN` from `react-native-worklets` instead of `runOnJS`.

## Types and Constants

```tsx
import Animated, {
  interpolate,
  Extrapolation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { scheduleOnRN } from 'react-native-worklets'

interface CarouselItem {
  id: string
  image: string
  backdropImage?: string
}

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const ITEM_WIDTH = SCREEN_WIDTH * 0.55
const ITEM_HEIGHT = Math.round(ITEM_WIDTH * 1.5)
const ITEM_SPACING = 12
const LEFT_MARGIN = 20
const VISIBLE_STACK_COUNT = 6
const STACK_OFFSET = (SCREEN_WIDTH - LEFT_MARGIN - ITEM_WIDTH) / (VISIBLE_STACK_COUNT - 1)
```

## Implementation Steps

### Step 1: CarouselBackdrop — crossfade between blurred images

Track `displayedIndex` and `previousIndex` in state. When `currentIndex` changes, update both and animate a `fadeAnim` shared value from 0 to 1 with `withTiming(1, { duration: 500 })`. When the animation finishes, sync `previousIndex` to `currentIndex` via `scheduleOnRN`.

Render two `Image` (from `expo-image`) layers (previous always visible, current fades in) inside a `MaskedView`. The mask is a `LinearGradient` with `locations={[0, 0.7, 1]}` and `colors={['black', 'black', 'transparent']}` — this fades the bottom edge to transparent.

Outside the `MaskedView`, add a `BlurView` with `intensity={blurIntensity}` and `tint="dark"` for the frosted glass effect. Then add a `View` with `experimental_backgroundImage: 'linear-gradient(...)'` that fades from transparent to `backgroundColor` at the bottom.

Prefetch adjacent images with `Image.prefetch()` whenever `currentIndex` changes.

### Step 2: GalleryCard — the stack-to-carousel blend

Each card computes its position by blending two layouts using a `galleryFactor`:

**Gallery factor** controls the blend: `interpolate(activeIndex.get(), [0, 1], [1, 0], CLAMP)` — fully stacked at index 0, fully carousel at index 1+.

**Stack layout**: `stackX = LEFT_MARGIN + index * STACK_OFFSET`, `stackScale = max(0.6, 1 - index * 0.06)`. Cards fan out from the left with progressively smaller scale.

**Carousel layout**: `centeredX = SCREEN_WIDTH / 2 - ITEM_WIDTH / 2 + diff * (ITEM_WIDTH + ITEM_SPACING)`, `centeredScale = interpolate(abs(diff), [0, 1], [1, 0.85], CLAMP)`. Active card is centered, neighbors are slightly smaller.

**Blend**: `translateX = galleryFactor * stackX + (1 - galleryFactor) * centeredX`. Same for scale. Set `zIndex = totalItems - index` so card 0 is always on top.

### Step 3: Dark overlay per card

Each card has an `Animated.View` overlay with `backgroundColor: 'black'` and animated opacity:

- **Carousel mode**: darkness increases with distance from active card — `interpolate(absDiff, [0, 1, 2, 3], [0, 0.5, 0.7, 0.85])`
- **Stack mode**: front card (index 0) has no overlay, all others get `0.5` opacity
- **Blend** between the two using `galleryFactor`

### Step 4: Pan gesture — swipe to browse

```tsx
const activeIndex = useSharedValue(0)
const startIndex = useSharedValue(0)

const gesture = Gesture.Pan()
  .activeOffsetX([-10, 10])
  .failOffsetY([-10, 10])
  .onStart(() => {
    startIndex.set(activeIndex.get())
  })
  .onUpdate((e) => {
    const newIndex = startIndex.get() - e.translationX / (ITEM_WIDTH + ITEM_SPACING)
    activeIndex.set(Math.max(0, Math.min(items.length - 1, newIndex)))
  })
  .onEnd((e) => {
    const projected = activeIndex.get() - e.velocityX / 1000
    const target = Math.max(0, Math.min(items.length - 1, Math.round(projected)))
    activeIndex.set(withSpring(target))
    scheduleOnRN(onIndexChange, target)
  })
```

Wrap the entire card container in a single `GestureDetector` with this pan gesture.

### Step 5: Tap gesture — press feedback

Add a `Gesture.Tap()` to each card with press scale animation (use `Gesture.Tap`, not `Pressable`, to keep press animations on the UI thread):

```tsx
const pressScale = useSharedValue(1)

const tapGesture = Gesture.Tap()
  .onBegin(() => {
    pressScale.set(withSpring(0.95))
  })
  .onEnd(() => {
    pressScale.set(withSpring(1))
    scheduleOnRN(onPressItem, item, index)
  })
  .onFinalize(() => {
    pressScale.set(withSpring(1))
  })
```

Multiply `pressScale.get()` into the card's final `scale` transform.

### Step 6: Render the cards

All cards are absolutely positioned inside a fixed-height container. Pan gesture wraps the container, each card gets its own tap gesture:

```tsx
<GestureDetector gesture={panGesture}>
  <View style={{ height: ITEM_HEIGHT, width: SCREEN_WIDTH }}>
    {items.map((item, index) => (
      <GalleryCard
        key={item.id}
        item={item}
        index={index}
        activeIndex={activeIndex}
        totalItems={items.length}
        onPressItem={onPressItem}
      />
    ))}
  </View>
</GestureDetector>
```

### Step 7: Compose the screen

```tsx
const [activeIndex, setActiveIndex] = useState(0)

<View style={{ flex: 1, backgroundColor: '#000' }}>
  <CarouselBackdrop
    images={items.map((i) => i.backdropImage ?? i.image)}
    currentIndex={activeIndex}
    height={400}
    backgroundColor="#000"
  />
  <View style={{ marginTop: 200 }}>
    <GalleryStackCarousel
      items={items}
      onIndexChange={setActiveIndex}
    />
  </View>
</View>
```

## Key Code Pattern

The core animation worklet that blends stack and carousel layouts:

```tsx
const animatedStyle = useAnimatedStyle(() => {
  const diff = index - activeIndex.get()
  const galleryFactor = interpolate(activeIndex.get(), [0, 1], [1, 0], Extrapolation.CLAMP)

  // Stack: fanned from left edge
  const stackX = LEFT_MARGIN + index * STACK_OFFSET
  const stackScale = Math.max(0.6, 1 - index * 0.06)

  // Carousel: centered with spacing
  const centeredX = SCREEN_WIDTH / 2 - ITEM_WIDTH / 2 + diff * (ITEM_WIDTH + ITEM_SPACING)
  const centeredScale = interpolate(Math.abs(diff), [0, 1], [1, 0.85], Extrapolation.CLAMP)

  // Blend between layouts
  const translateX = galleryFactor * stackX + (1 - galleryFactor) * centeredX
  const scale = (galleryFactor * stackScale + (1 - galleryFactor) * centeredScale) * pressScale.get()

  return {
    transform: [{ translateX }, { scale }],
    zIndex: totalItems - index,
  }
})
```

## Common Pitfalls

- **`galleryFactor` only spans index 0 → 1.** The stack-to-carousel blend happens during the first swipe. Once past index 1, it stays in full carousel mode. This is intentional — don't change the interpolation range.
- **Cards must be `position: 'absolute'`** inside the carousel container, which needs an explicit `height` equal to `ITEM_HEIGHT`.
- **`zIndex` must be static.** Set `zIndex: totalItems - index` so card 0 is always on top. Animating zIndex causes flicker.
- **`BlurView` goes outside `MaskedView`**, not inside. If placed inside, the blur gets clipped by the gradient mask and looks broken.
- **Prefetch adjacent backdrop images** with `Image.prefetch()` to prevent flicker during crossfade.
- **Velocity projection matters for feel.** The snap target is `activeIndex.get() - velocityX / 1000` rounded to the nearest integer. Without velocity projection, fast swipes only advance one card and feel sluggish.
- **Use `scheduleOnRN` from `react-native-worklets`** instead of the deprecated `runOnJS` when calling JS callbacks from gesture handlers or animation callbacks.
- **Use `.get()` and `.set()` on shared values** instead of `.value` for React Compiler compatibility.
- **Only animate `transform` and `opacity`** — these run on the GPU. Never animate layout properties like `width`, `height`, `top`, `left`, or `margin`.
- **Use `Gesture.Tap()` instead of `Pressable`** for press animations — keeps the scale animation on the UI thread without bridge overhead.
- **Always include `borderCurve: 'continuous'`** alongside `borderRadius` for smooth iOS-native corner curves.
