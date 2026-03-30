# Gallery Stack Carousel - Implementation Brief

This animation is two components:

- `GalleryStackCarousel.tsx`
- `CarouselBackdrop.tsx`

The screen only coordinates `activeIndex` and passes it into both pieces.

## Required packages

```tsx
react-native-reanimated
react-native-gesture-handler
react-native-worklets
expo-blur
expo-image
expo-linear-gradient
@react-native-masked-view/masked-view
```

## Data shape and layout constants

```tsx
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

## Gallery card layout blend

Every card stays mounted and absolutely positioned. The main worklet blends a left-fanned stack into a centered carousel as `activeIndex` moves from `0` to `1`.

```tsx
const animatedStyle = useAnimatedStyle(() => {
  const diff = index - activeIndex.get()
  const galleryFactor = interpolate(
    activeIndex.get(),
    [0, 1],
    [1, 0],
    Extrapolation.CLAMP,
  )

  const stackX = LEFT_MARGIN + index * STACK_OFFSET
  const stackScale = Math.max(0.6, 1 - index * 0.06)

  const centeredX =
    SCREEN_WIDTH / 2 - ITEM_WIDTH / 2 + diff * (ITEM_WIDTH + ITEM_SPACING)
  const centeredScale = interpolate(
    Math.abs(diff),
    [0, 1],
    [1, 0.85],
    Extrapolation.CLAMP,
  )

  const translateX = galleryFactor * stackX + (1 - galleryFactor) * centeredX
  const scale =
    (galleryFactor * stackScale + (1 - galleryFactor) * centeredScale) *
    pressScale.get()

  return {
    transform: [{ translateX }, { scale }],
    zIndex: totalItems - index,
  }
})
```

Keep the dark overlay per card as a separate animated layer:

```tsx
const overlayStyle = useAnimatedStyle(() => {
  const diff = index - activeIndex.get()
  const absDiff = Math.abs(diff)
  const galleryFactor = interpolate(activeIndex.get(), [0, 1], [1, 0], Extrapolation.CLAMP)

  const carouselDarkness = interpolate(
    absDiff,
    [0, 1, 2, 3],
    [0, 0.5, 0.7, 0.85],
    Extrapolation.CLAMP,
  )

  const stackDarkness = index === 0 ? 0 : 0.5

  return {
    opacity: interpolate(
      galleryFactor,
      [0, 1],
      [carouselDarkness, stackDarkness],
      Extrapolation.CLAMP,
    ),
  }
})
```

## Gestures

The container owns the swipe. Each card owns a tap gesture for press feedback and optional selection.

```tsx
const activeIndex = useSharedValue(0)
const startIndex = useSharedValue(0)

const panGesture = Gesture.Pan()
  .activeOffsetX([-10, 10])
  .failOffsetY([-10, 10])
  .onStart(() => {
    startIndex.set(activeIndex.get())
  })
  .onUpdate((e) => {
    const nextIndex = startIndex.get() - e.translationX / (ITEM_WIDTH + ITEM_SPACING)
    activeIndex.set(Math.max(0, Math.min(items.length - 1, nextIndex)))
  })
  .onEnd((e) => {
    const projected = activeIndex.get() - e.velocityX / 1000
    const target = Math.max(0, Math.min(items.length - 1, Math.round(projected)))
    activeIndex.set(withSpring(target))
    if (onIndexChange) scheduleOnRN(onIndexChange, target)
  })
```

Tap gesture per card:

```tsx
const pressScale = useSharedValue(1)

const tapGesture = Gesture.Tap()
  .onBegin(() => {
    pressScale.set(withSpring(0.95))
  })
  .onEnd(() => {
    pressScale.set(withSpring(1))
    if (onPressItem) scheduleOnRN(onPressItem, item, index)
  })
  .onFinalize(() => {
    pressScale.set(withSpring(1))
  })
```

## Card render structure

Render all cards inside one fixed-height container:

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

Card styling should stay simple:

```tsx
const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    borderRadius: 6,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.16)',
  },
})
```

## Backdrop crossfade

`CarouselBackdrop.tsx` keeps two image layers:

- `previousIndex`
- `displayedIndex`

When `currentIndex` changes:

```tsx
const [displayedIndex, setDisplayedIndex] = useState(currentIndex)
const [previousIndex, setPreviousIndex] = useState(currentIndex)
const fadeAnim = useSharedValue(1)

useEffect(() => {
  if (currentIndex !== displayedIndex) {
    setPreviousIndex(displayedIndex)
    setDisplayedIndex(currentIndex)
    fadeAnim.set(0)
    fadeAnim.set(
      withTiming(1, { duration: 500 }, (finished) => {
        if (finished) {
          scheduleOnRN(setPreviousIndex, currentIndex)
        }
      })
    )
  }
}, [currentIndex, displayedIndex, fadeAnim])
```

Prefetch the adjacent backdrop images:

```tsx
useEffect(() => {
  const urls = [images[currentIndex - 1], images[currentIndex + 1]].filter(Boolean) as string[]
  urls.forEach((url) => Image.prefetch(url))
}, [currentIndex, images])
```

Render the backdrop like this:

```tsx
<View style={[styles.backdrop, { height }]} pointerEvents="none">
  <MaskedView
    style={{ height, width: '100%' }}
    maskElement={
      <LinearGradient
        locations={[0, 0.7, 1]}
        colors={['black', 'black', 'transparent']}
        style={StyleSheet.absoluteFill}
      />
    }
  >
    <Image source={{ uri: images[previousIndex] }} style={[styles.image, { height }]} contentFit="cover" />
    <Animated.View style={[StyleSheet.absoluteFill, foregroundStyle]}>
      <Image source={{ uri: images[displayedIndex] }} style={[styles.image, { height }]} contentFit="cover" />
    </Animated.View>
  </MaskedView>

  <BlurView style={[StyleSheet.absoluteFill, { height }]} intensity={blurIntensity} tint="dark" />

  {/* Any equivalent bottom fade is fine. The demo uses a gradient-style overlay here. */}
</View>
```

## Screen composition

```tsx
const [activeIndex, setActiveIndex] = useState(0)

return (
  <View style={{ flex: 1, backgroundColor: '#000' }}>
    <CarouselBackdrop
      images={items.map((item) => item.backdropImage ?? item.image)}
      currentIndex={activeIndex}
      height={400}
      backgroundColor="#000"
    />

    <View style={{ marginTop: 200 }}>
      <GalleryStackCarousel
        items={items}
        onIndexChange={setActiveIndex}
        onPressItem={(item) => console.log(item.id)}
      />
    </View>
  </View>
)
```

## Do not change these behaviors

- `galleryFactor` only interpolates from index `0` to `1`.
- Cards are always `position: 'absolute'`.
- `zIndex` is static: `totalItems - index`.
- Use velocity projection on pan end before rounding.
- Keep `BlurView` outside the `MaskedView`.
- Use `.get()` / `.set()` on shared values.
- Use `scheduleOnRN` for JS callbacks from gestures and animation completions.
