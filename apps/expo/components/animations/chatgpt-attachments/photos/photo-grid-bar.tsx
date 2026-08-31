import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { BOTTOM_BAR, COLORS, DURATION, EASE_FADE, SPRING } from '../constants';
import { Glass } from '../glass';
import { SheetBar } from '../panel/sheet-bar';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
 * between one and twelve. The sprung width is what makes it a move, not a jump.
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

interface PhotoGridBarProps {
  width: number;
  selected: string[];
  /** Whether the controls are wearing their glass. */
  active: boolean;
  /** Fades the labels and the chevron with the grid — see `SheetBar`. */
  fade: SharedValue<number>;
  onBack: () => void;
  onConfirm: () => void;
}

/** The confirm capsule that floats over the grid, on the shared `SheetBar`. */
export function PhotoGridBar({
  width,
  selected,
  active,
  fade,
  onBack,
  onConfirm,
}: PhotoGridBarProps) {
  return (
    <SheetBar width={width} active={active} fade={fade} onBack={onBack}>
      <ConfirmPill count={selected.length} active={active} fade={fade} onPress={onConfirm} />
    </SheetBar>
  );
}

const styles = StyleSheet.create({
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
