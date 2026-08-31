import { Icon } from '@/components/icon';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { BOTTOM_BAR, COLORS, DURATION, GUTTER } from '../constants';
import { Glass } from '../glass';

interface SheetBarProps {
  width: number;
  /** Whether the controls are wearing their glass and taking touches. */
  active: boolean;
  /**
   * Fades the glyphs with the sheet. The glass itself can't be faded, but
   * anything drawn inside it can, which is how the controls still arrive and
   * leave with the rest of the sheet.
   */
  fade: SharedValue<number>;
  onBack: () => void;
  /** The sheet's own controls, filling the bar to the right of the ‹. */
  children: ReactNode;
}

/**
 * The row of controls floating over a sheet: the ‹ button, and whatever the
 * sheet puts beside it — the grid its confirm capsule, the camera its shutter
 * and options.
 *
 * Deliberately not part of either sheet, and not part of the panel: these are
 * glass, and the sheet's whole subtree has its opacity animated through the
 * morph, which would leave them rendering as nothing. They sit at the bottom of
 * the window on their own — which is where the reference keeps them for as long
 * as they are up — and switch their material natively instead of fading.
 *
 * The controls stay mounted while the menu is up, wearing no material and with
 * their contents faded out; `active` is what keeps them from taking the taps
 * meant for the menu behind them.
 *
 * Nothing in here clips. A glass control on iOS 26 draws its rim, and the bulge
 * it makes under a finger, outside its own bounds; an `overflow: hidden`
 * anywhere above it cuts both off and leaves a flat disc behind.
 */
export function SheetBar({ width, active, fade, onBack, children }: SheetBarProps) {
  const backStyle = useAnimatedStyle(() => ({ opacity: fade.get() }));

  return (
    <View pointerEvents={active ? 'box-none' : 'none'} style={[styles.bar, { width }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to menu" onPress={onBack}>
        <Glass
          radius={BOTTOM_BAR.controlSize / 2}
          active={active}
          duration={DURATION.crossfade / 1000}
          style={styles.back}
        >
          <Animated.View style={backStyle}>
            <Icon name="chevron-left" size={BOTTOM_BAR.backIcon} color={COLORS.text} />
          </Animated.View>
        </Glass>
      </Pressable>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    // The controls belong to the sheet, so they sit inside its edges rather
    // than the screen's — the same inset on the bottom as on the sides, which
    // is what squares up the two corners they float in. The sheet stops a
    // gutter short of the bottom of the screen, so that gutter is counted in.
    left: GUTTER,
    bottom: GUTTER + BOTTOM_BAR.inset,
    height: BOTTOM_BAR.controlSize,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: BOTTOM_BAR.inset,
  },
  back: {
    width: BOTTOM_BAR.controlSize,
    height: BOTTOM_BAR.controlSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
