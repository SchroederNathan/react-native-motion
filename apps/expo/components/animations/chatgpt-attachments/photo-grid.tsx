import { Icon } from '@/components/icon';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { memo, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { BOTTOM_BAR, COLORS, DURATION, EASE_FADE, GRID, GUTTER, SPRING } from './constants';
import { Glass } from './glass';
import type { LibraryPhoto, LibraryStatus } from './use-photo-library';

/**
 * Width of one of the three columns. No gutter to remove: the sheet carries the
 * inset, and the grid runs edge to edge inside it.
 */
function slotSize(width: number) {
  return width / GRID.columns;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface CellProps {
  photo: LibraryPhoto;
  slot: number;
  /** 1-based tap order, or 0 when the photo isn't selected. */
  order: number;
  onPress: (photo: LibraryPhoto) => void;
}

const PhotoCell = memo(function PhotoCell({ photo, slot, order, onPress }: CellProps) {
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
      style={{ width: slot, height: slot }}
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

interface ConfirmPillProps {
  count: number;
  /** Whether the capsule is wearing its glass. */
  active: boolean;
  /** Fades the labels with the grid. Glass can only be faded from the inside. */
  fade: SharedValue<number>;
  onPress: () => void;
}

/**
 * "All Photos" ⇄ "Add N photos". The tint and the label crossfade over about
 * four frames, and the capsule resizes under them: the label grows every time
 * the count gains a digit or "photo" becomes "photos", and that is a good 40pt
 * between one and twelve. `PILL_LAYOUT` is what makes it a move and not a jump.
 *
 * One glass capsule, never faded — a `GlassView` can't be animated through
 * opacity. The blue is a plain view laid over it, carrying the capsule's own
 * radius, and the labels crossfade on top.
 *
 * The width still comes from a hidden copy of whichever label is current, but
 * that copy now only measures: it reports its width and the capsule springs to
 * it. A layout animation would have been less code and moved both edges, which
 * is not what this is — the capsule is pinned to the bar's trailing edge and
 * opens leftwards, the way a button that stays under your thumb has to.
 */
function ConfirmPill({ count, active, fade, onPress }: ConfirmPillProps) {
  const hasSelection = count > 0;
  const label = count === 1 ? 'Add 1 photo' : `Add ${count} photos`;

  // Driven through a derived value rather than `withTiming` straight in the
  // style: the result of `withTiming` is an animation descriptor, and doing
  // arithmetic on one (here, multiplying by the grid's fade) produces NaN.
  const swap = useDerivedValue(() =>
    withTiming(hasSelection ? 1 : 0, { duration: DURATION.pill, easing: EASE_FADE }),
  );
  const plain = useAnimatedStyle(() => ({ opacity: (1 - swap.get()) * fade.get() }));
  const tinted = useAnimatedStyle(() => ({ opacity: swap.get() * fade.get() }));

  const [labelWidth, setLabelWidth] = useState(0);
  const width = useSharedValue(0);
  useEffect(() => {
    if (!labelWidth) return;
    // The first measurement has nothing to move from, so it lands outright.
    width.set(width.get() === 0 ? labelWidth : withSpring(labelWidth, SPRING.pill));
  }, [labelWidth, width]);
  const sizeStyle = useAnimatedStyle(() => ({
    width: width.get() + BOTTOM_BAR.pillPaddingHorizontal * 2,
  }));

  return (
    // Full width, contents pushed to the trailing edge. The slot is what holds
    // the capsule's right edge still; it is also what gives the sizer room to
    // measure in, which it would not have inside the capsule it is sizing.
    <View pointerEvents="box-none" style={styles.pillSlot}>
      {/* Measures the label; never painted, never sizes anything itself. */}
      <Text
        numberOfLines={1}
        onLayout={(event) => setLabelWidth(event.nativeEvent.layout.width)}
        style={[styles.pillLabel, styles.pillSizer]}
      >
        {hasSelection ? label : 'All Photos'}
      </Text>

      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={hasSelection ? label : 'All photos'}
        disabled={!hasSelection}
        onPress={onPress}
        style={sizeStyle}
      >
        <Glass
          radius={BOTTOM_BAR.pillHeight / 2}
          active={active}
          duration={DURATION.crossfade / 1000}
          style={styles.pill}
        >
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, styles.pillTint, tinted]}
          />
          <Animated.Text numberOfLines={1} style={[styles.pillLabel, styles.pillText, plain]}>
            All Photos
          </Animated.Text>
          <Animated.Text numberOfLines={1} style={[styles.pillLabel, styles.pillText, tinted]}>
            {label}
          </Animated.Text>
        </Glass>
      </AnimatedPressable>
    </View>
  );
}

interface PhotoGridProps {
  width: number;
  height: number;
  photos: LibraryPhoto[];
  status: LibraryStatus;
  /** Ids in tap order — the index inside drives the badge number. */
  selected: string[];
  bottomInset: number;
  onTogglePhoto: (photo: LibraryPhoto) => void;
}

/**
 * Everything the panel shows once it has become the grid. Laid out at its full
 * on-screen size and then left alone: the panel scales this whole subtree
 * during the morph, so nothing in here has to know a transition is happening.
 */
export function PhotoGrid({
  width,
  height,
  photos,
  status,
  selected,
  bottomInset,
  onTogglePhoto,
}: PhotoGridProps) {
  const slot = slotSize(width);

  return (
    <View style={[styles.root, { width, height }]}>
      {status === 'ready' ? (
        <FlashList
          data={photos}
          numColumns={GRID.columns}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PhotoCell
              photo={item}
              slot={slot}
              order={selected.indexOf(item.id) + 1}
              onPress={onTogglePhoto}
            />
          )}
          extraData={selected}
          // The keyboard is up the whole time this grid is on screen. Without
          // this the underlying scroll view treats the first tap as "dismiss
          // the keyboard" and swallows it, so the photo never gets selected.
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          // The bar floats over the grid, so the last row has to clear it.
          ListFooterComponent={
            <View style={{ height: bottomInset + BOTTOM_BAR.pillHeight + 24 }} />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            {status === 'loading'
              ? 'Loading photos…'
              : status === 'empty'
                ? 'No photos on this device.'
                : 'Photo access is off. Turn it on in Settings to try this demo.'}
          </Text>
        </View>
      )}

    </View>
  );
}

interface PhotoGridBarProps {
  width: number;
  bottomInset: number;
  selected: string[];
  /** Whether the controls are wearing their glass. */
  active: boolean;
  /**
   * Fades the labels and the chevron with the grid. The glass itself can't be
   * faded, but anything drawn inside it can, which is how these still arrive
   * and leave with the rest of the grid.
   */
  fade: SharedValue<number>;
  onBack: () => void;
  onConfirm: () => void;
}

/**
 * The ‹ button and the confirm capsule that float over the grid.
 *
 * Deliberately not part of `PhotoGrid`, and not part of the panel either: these
 * are glass, and the grid's whole subtree has its opacity animated through the
 * morph, which would leave them rendering as nothing. They sit at the bottom of
 * the window on their own — which is where the reference keeps them for as long
 * as they are up — and switch their material natively instead of fading.
 *
 * Nothing in here clips. A glass control on iOS 26 draws its rim, and the bulge
 * it makes under a finger, outside its own bounds; an `overflow: hidden`
 * anywhere above it cuts both off and leaves a flat disc behind.
 */
export function PhotoGridBar({
  width,
  bottomInset,
  selected,
  active,
  fade,
  onBack,
  onConfirm,
}: PhotoGridBarProps) {
  const contentStyle = useAnimatedStyle(() => ({ opacity: fade.get() }));

  return (
    <View
      // Both controls stay mounted while the menu is up, wearing no material and
      // with their contents faded out. Without this they would still take the
      // taps meant for the menu behind them.
      pointerEvents={active ? 'box-none' : 'none'}
      style={[styles.bar, { bottom: bottomInset, width }]}
    >
      <Pressable accessibilityRole="button" accessibilityLabel="Back to menu" onPress={onBack}>
        <Glass
          radius={BOTTOM_BAR.backSize / 2}
          active={active}
          duration={DURATION.crossfade / 1000}
          style={styles.back}
        >
          <Animated.View style={contentStyle}>
            <Icon name="chevron-left" size={BOTTOM_BAR.backIcon} color={COLORS.text} />
          </Animated.View>
        </Glass>
      </Pressable>

      <ConfirmPill count={selected.length} active={active} fade={fade} onPress={onConfirm} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    top: 0,
    transformOrigin: 'top left',
    // Deliberately no background: the panel's material shows through the gutter
    // and between the cells. Painting this is what makes the grid a slab.
  },
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
    backgroundColor: '#141414',
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
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
  },
  placeholderText: {
    color: COLORS.placeholder,
    fontSize: 15,
    textAlign: 'center',
  },
  bar: {
    position: 'absolute',
    // The controls belong to the sheet, so they start where it does.
    left: GUTTER,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: BOTTOM_BAR.paddingHorizontal,
  },
  back: {
    width: BOTTOM_BAR.backSize,
    height: BOTTOM_BAR.backSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillSlot: {
    flex: 1,
    alignItems: 'flex-end',
  },
  pill: {
    // Fills the button rather than sizing it, so the width being sprung is the
    // one the glass wears.
    height: BOTTOM_BAR.pillHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillLabel: {
    color: COLORS.text,
    fontSize: BOTTOM_BAR.pillLabelSize,
    fontWeight: '600',
    // Proportional figures are narrower on a 1 than on a 0, so the capsule
    // would resize by a point or two going from "Add 1 photos" to "Add 2
    // photos" — a wobble with no meaning behind it. Tabular figures mean it
    // only moves when the count actually gains a digit. The hidden sizer wears
    // this style too, so what it measures is what gets drawn.
    fontVariant: ['tabular-nums'],
  },
  pillTint: {
    // Carries its own shape: the glass underneath no longer clips its children,
    // so that an interactive press can bulge past the capsule's edge.
    borderRadius: BOTTOM_BAR.pillHeight / 2,
    borderCurve: 'continuous',
    backgroundColor: COLORS.accentGlass,
  },
  pillSizer: {
    position: 'absolute',
    left: 0,
    opacity: 0,
  },
  pillText: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
});
