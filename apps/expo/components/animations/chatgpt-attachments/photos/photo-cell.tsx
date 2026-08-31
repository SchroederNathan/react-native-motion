import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated';
import { COLORS, GRID, SPRING } from '../constants';
import type { LibraryPhoto } from './use-photo-library';

/**
 * Width of one of the three columns. No gutter to remove: the sheet carries the
 * inset, and the grid runs edge to edge inside it.
 */
export function slotSize(width: number) {
  return width / GRID.columns;
}

interface CellProps {
  photo: LibraryPhoto;
  slot: number;
  /** 1-based tap order, or 0 when the photo isn't selected. */
  order: number;
  /**
   * True once this photo has left for the composer. Cut rather than faded: a
   * copy of it is flying out of this exact rect on the same frame, and two of
   * the same photo pulling apart is the one thing a shared element cannot show.
   */
  lifted: boolean;
  onPress: (photo: LibraryPhoto) => void;
}

export const PhotoCell = memo(function PhotoCell({
  photo,
  slot,
  order,
  lifted,
  onPress,
}: CellProps) {
  const selected = order > 0;
  // Selection is the badge and nothing else: in the reference the thumbnail
  // itself is untouched — it does not shrink, dim, or round its corners.
  // The badge is the one thing on this screen allowed to look springy; a
  // timing curve makes the same scale read as a fade with extra steps.
  const progress = useDerivedValue(() => withSpring(selected ? 1 : 0, SPRING.badge));

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ scale: interpolate(progress.get(), [0, 1], [0.4, 1]) }],
  }));

  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityState={{ selected }}
      onPress={() => onPress(photo)}
      style={{ width: slot, height: slot, opacity: lifted ? 0 : 1 }}
    >
      <View style={styles.cell}>
        <Image
          source={photo.id}
          recyclingKey={photo.id}
          contentFit="cover"
          cachePolicy="memory-disk"
          style={StyleSheet.absoluteFill}
        />
      </View>
      <Animated.View pointerEvents="none" style={[styles.badge, badgeStyle]}>
        <Text style={styles.badgeLabel}>{selected ? order : ''}</Text>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  cell: {
    position: 'absolute',
    left: 0,
    top: 0,
    // A hairline of the sheet shows through on the right and bottom of every
    // cell. Paired with the cell's own small radius, that is what separates
    // the photos — without both, the grid reads as one image cut into nine.
    right: GRID.gap,
    bottom: GRID.gap,
    borderRadius: GRID.cellRadius,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: COLORS.photoFill,
  },
  badge: {
    position: 'absolute',
    right: GRID.badgeInset + GRID.gap,
    bottom: GRID.badgeInset + GRID.gap,
    width: GRID.badgeSize,
    height: GRID.badgeSize,
    borderRadius: GRID.badgeSize / 2,
    borderWidth: GRID.badgeRing,
    borderColor: COLORS.text,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
  },
  badgeLabel: {
    color: COLORS.text,
    fontSize: GRID.badgeLabelSize,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
