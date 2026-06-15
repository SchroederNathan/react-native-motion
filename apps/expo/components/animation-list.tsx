import { FlashList, type ViewToken } from '@shopify/flash-list';
import { Link } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { animations, type Animation } from '@/data/animations';
import { useTheme } from '@/theme';
import { VideoCard } from './video-card';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function PressableCard({
  animation,
  isActive,
}: {
  animation: Animation;
  isActive: boolean;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Link href={`/animations/${animation.slug}`} asChild>
      <AnimatedPressable
        style={animatedStyle}
        onPressIn={() => {
          scale.value = withSpring(0.98);
        }}
        onPressOut={() => {
          scale.value = withSpring(1);
        }}
      >
        <VideoCard animation={animation} isActive={isActive} />
      </AnimatedPressable>
    </Link>
  );
}

export function AnimationList() {
  const { colors, tokens } = useTheme();
  const [activeSlug, setActiveSlug] = useState<string | null>(
    animations[0]?.slug ?? null,
  );

  // FlashList requires a stable callback/config (changing them on the fly is
  // unsupported). The top-most card that covers most of the viewport plays.
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<Animation>[] }) => {
      const first = viewableItems.find((v) => v.isViewable && v.item);
      if (first?.item) setActiveSlug(first.item.slug);
    },
  ).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 70 }).current;

  const renderItem = useCallback(
    ({ item }: { item: Animation }) => (
      <PressableCard animation={item} isActive={item.slug === activeSlug} />
    ),
    [activeSlug],
  );

  return (
    <FlashList
      data={animations}
      renderItem={renderItem}
      keyExtractor={(item) => item.slug}
      extraData={activeSlug}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: tokens.spacing.lg,
        paddingBottom: tokens.spacing['2xl'],
      }}
      ItemSeparatorComponent={() => <View style={{ height: tokens.spacing.xl }} />}
    />
  );
}
