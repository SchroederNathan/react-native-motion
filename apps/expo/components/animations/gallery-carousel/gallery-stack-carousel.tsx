import { useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

export interface CarouselItem {
  id: string;
  /** Solid fill for the card — stands in for artwork in this demo. */
  color: string;
  label?: string;
}

const ITEM_SPACING = 12;
const LEFT_MARGIN = 20;
const VISIBLE_STACK_COUNT = 6;

/** Layout values derived from the live screen width. */
interface Layout {
  screenWidth: number;
  itemWidth: number;
  itemHeight: number;
  stackOffset: number;
}

function GalleryCard({
  item,
  index,
  activeIndex,
  totalItems,
  layout,
  onIndexChange,
  onPressItem,
}: {
  item: CarouselItem;
  index: number;
  activeIndex: SharedValue<number>;
  totalItems: number;
  layout: Layout;
  onIndexChange?: (index: number) => void;
  onPressItem?: (item: CarouselItem, index: number) => void;
}) {
  const { screenWidth, itemWidth, itemHeight, stackOffset } = layout;

  const animatedStyle = useAnimatedStyle(() => {
    const diff = index - activeIndex.get();
    // 1 → fully fanned stack, 0 → centered carousel.
    const galleryFactor = interpolate(
      activeIndex.get(),
      [0, 1],
      [1, 0],
      Extrapolation.CLAMP,
    );

    // Stack layout: fanned from the left edge, progressively smaller.
    const stackX = LEFT_MARGIN + index * stackOffset;
    const stackScale = Math.max(0.6, 1 - index * 0.06);

    // Carousel layout: centered, neighbors slightly smaller.
    const centeredX =
      screenWidth / 2 - itemWidth / 2 + diff * (itemWidth + ITEM_SPACING);
    const centeredScale = interpolate(
      Math.abs(diff),
      [0, 1],
      [1, 0.85],
      Extrapolation.CLAMP,
    );

    // Blend the two layouts together.
    const translateX = galleryFactor * stackX + (1 - galleryFactor) * centeredX;
    const scale =
      (galleryFactor * stackScale + (1 - galleryFactor) * centeredScale)

    return {
      transform: [{ translateX }, { scale }],
      zIndex: totalItems - index,
    };
  });

  const overlayStyle = useAnimatedStyle(() => {
    const diff = index - activeIndex.get();
    const absDiff = Math.abs(diff);
    const galleryFactor = interpolate(
      activeIndex.get(),
      [0, 1],
      [1, 0],
      Extrapolation.CLAMP,
    );

    const carouselDarkness = interpolate(
      absDiff,
      [0, 1, 2, 3],
      [0, 0.5, 0.7, 0.85],
      Extrapolation.CLAMP,
    );
    const stackDarkness = index === 0 ? 0 : 0.5;

    return {
      opacity: interpolate(
        galleryFactor,
        [0, 1],
        [carouselDarkness, stackDarkness],
        Extrapolation.CLAMP,
      ),
    };
  });

  return (
    <Animated.View
      style={[
        styles.card,
        { width: itemWidth, height: itemHeight, backgroundColor: item.color },
        animatedStyle,
      ]}
    >
      {item.label ? (
        <Text style={styles.cardLabel} selectable={false}>
          {item.label}
        </Text>
      ) : null}
      <Animated.View style={[styles.darkOverlay, overlayStyle]} />
    </Animated.View>
  );
}

export function GalleryStackCarousel({
  items,
  onIndexChange,
  onPressItem,
}: {
  items: CarouselItem[];
  onIndexChange?: (index: number) => void;
  onPressItem?: (item: CarouselItem, index: number) => void;
}) {
  const { width: screenWidth } = useWindowDimensions();

  const layout = useMemo<Layout>(() => {
    const itemWidth = screenWidth * 0.55;
    return {
      screenWidth,
      itemWidth,
      itemHeight: Math.round(itemWidth * 1.5),
      stackOffset:
        (screenWidth - LEFT_MARGIN - itemWidth) / (VISIBLE_STACK_COUNT - 1),
    };
  }, [screenWidth]);

  const activeIndex = useSharedValue(0);
  const startIndex = useSharedValue(0);
  const step = layout.itemWidth + ITEM_SPACING;

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onStart(() => {
      startIndex.set(activeIndex.get());
    })
    .onUpdate((e) => {
      const newIndex = startIndex.get() - e.translationX / step;
      activeIndex.set(Math.max(0, Math.min(items.length - 1, newIndex)));
    })
    .onEnd((e) => {
      const projected = activeIndex.get() - e.velocityX / 1000;
      const target = Math.max(
        0,
        Math.min(items.length - 1, Math.round(projected)),
      );
      activeIndex.set(withSpring(target));
      if (onIndexChange) scheduleOnRN(onIndexChange, target);
    });

  return (
    <GestureDetector gesture={panGesture}>
      <View style={{ height: layout.itemHeight, width: layout.screenWidth }}>
        {items.map((item, index) => (
          <GalleryCard
            key={item.id}
            item={item}
            index={index}
            activeIndex={activeIndex}
            totalItems={items.length}
            layout={layout}
            onIndexChange={onIndexChange}
            onPressItem={onPressItem}
          />
        ))}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    borderRadius: 16,
    borderCurve: 'continuous',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 12px 24px -8px rgba(0, 0, 0, 0.35)',
  },
  cardLabel: {
    color: 'rgba(255, 255, 255, 0.92)',
    fontSize: 48,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  darkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
  },
});
