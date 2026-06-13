import { FlashList, type ViewToken } from '@shopify/flash-list';
import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { animations, type Animation } from '@/data/animations';
import { useTheme } from '@/theme';
import { VideoCard } from './video-card';

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
      <VideoCard animation={item} isActive={item.slug === activeSlug} />
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
