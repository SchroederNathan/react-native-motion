import { Icon } from '@/components/icon';
import type { FlashMode } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { BOTTOM_BAR, CAMERA, COLORS, DURATION, SPRING } from '../constants';
import { Glass } from '../glass';
import { SheetBar } from '../panel/sheet-bar';

interface OptionProps {
  /** 1 for the option directly above ⋯, 2 for the one above that. */
  index: number;
  label: string;
  icon: 'camera-flip' | 'flash' | 'flash-off';
  /** 0 folded into the ⋯ button → 1 sitting in its own place above it. */
  unfold: SharedValue<number>;
  /** Whether the option is wearing its glass. */
  active: boolean;
  /** Fades the icon with the sheet. */
  fade: SharedValue<number>;
  onPress: () => void;
}

/**
 * One of the two buttons that come out of the ⋯ button. It is laid out exactly
 * where the ⋯ is and then moved: `unfold` carries it up to its own slot and
 * scales it from a fraction of its size, so what you see is a button growing
 * out of the one you pressed. The glass rides the transform — a transform is
 * one of the things a `GlassView` is fine under — and comes in on its own
 * native ramp, since its opacity can't be animated.
 */
function Option({ index, label, icon, unfold, active, fade, onPress }: OptionProps) {
  const rise = index * (BOTTOM_BAR.controlSize + CAMERA.optionGap);

  const style = useAnimatedStyle(() => {
    const u = unfold.get();
    return {
      transform: [
        { translateY: -rise * u },
        {
          scale: interpolate(
            u,
            [0, 1],
            [CAMERA.optionStartScale, 1],
            // The spring overshoots on the way in; the button is allowed to
            // as well. It is not allowed to invert on the way out.
            Extrapolation.EXTEND,
          ),
        },
      ],
    };
  });

  // Clamped where the transform is not: `withSpring` settles past 1, and an
  // opacity past 1 is an error where a scale past 1 is a bounce.
  const iconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(unfold.get(), [0.2, 0.8], [0, 1], Extrapolation.CLAMP) * fade.get(),
  }));

  return (
    <Animated.View pointerEvents={active ? 'auto' : 'none'} style={[styles.option, style]}>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
        <Glass
          radius={BOTTOM_BAR.controlSize / 2}
          active={active}
          duration={DURATION.crossfade / 1000}
          style={styles.round}
        >
          <Animated.View style={iconStyle}>
            <Icon name={icon} size={CAMERA.optionIcon} color={COLORS.text} />
          </Animated.View>
        </Glass>
      </Pressable>
    </Animated.View>
  );
}

interface CameraBarProps {
  width: number;
  /** Whether the controls are wearing their glass and taking touches. */
  active: boolean;
  /** Fades the glyphs with the sheet — see `SheetBar`. */
  fade: SharedValue<number>;
  flash: FlashMode;
  onBack: () => void;
  onCapture: () => void;
  onFlip: () => void;
  onToggleFlash: () => void;
}

/**
 * The shutter and the ⋯ button that float over the camera, on the `SheetBar`
 * the grid's controls share — same line, same inset, same ‹ button.
 *
 * The ⋯ unfolds two options straight up out of itself — flip, then flash — on
 * the panel's own springs: `SPRING.panel` out, with its bounce, and
 * `SPRING.panelOut` back, without it. While they are out the ⋯ reads as an ✕.
 */
export function CameraBar({
  width,
  active,
  fade,
  flash,
  onBack,
  onCapture,
  onFlip,
  onToggleFlash,
}: CameraBarProps) {
  const [open, setOpen] = useState(false);
  const unfold = useSharedValue(0);

  const toggleOptions = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOpen((was) => {
      unfold.set(withSpring(was ? 0 : 1, was ? SPRING.panelOut : SPRING.panel));
      return !was;
    });
  }, [unfold]);

  const contentStyle = useAnimatedStyle(() => ({ opacity: fade.get() }));

  // ⋯ ⇄ ✕, crossfading in place. The ✕ arrives with a quarter turn so the
  // swap reads as the same glyph turning rather than two glyphs trading.
  const dotsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(unfold.get(), [0, 0.5], [1, 0], Extrapolation.CLAMP) * fade.get(),
  }));
  const closeStyle = useAnimatedStyle(() => {
    const u = unfold.get();
    return {
      opacity: interpolate(u, [0.3, 0.8], [0, 1], Extrapolation.CLAMP) * fade.get(),
      transform: [{ rotate: `${interpolate(u, [0, 1], [-90, 0])}deg` }],
    };
  });

  return (
    <SheetBar width={width} active={active} fade={fade} onBack={onBack}>
      {/* The shutter: a glass ring with a white disc set into it. The disc is a
          child of the material, so it fades with the sheet the way every other
          glyph here does, while the ring switches its material natively. */}
      <View pointerEvents="box-none" style={styles.shutterSlot}>
        <Pressable accessibilityRole="button" accessibilityLabel="Take photo" onPress={onCapture}>
          <Glass
            radius={CAMERA.shutterSize / 2}
            active={active}
            duration={DURATION.crossfade / 1000}
            style={styles.shutter}
          >
            <Animated.View style={[styles.shutterDisc, contentStyle]} />
          </Glass>
        </Pressable>
      </View>

      {/* The ⋯ and what unfolds from it. The options are absolutely positioned
          over the ⋯ and rise out of it; they render first so the ⋯ stays on
          top for the frames they still overlap it. */}
      <View style={styles.more}>
        <Option
          index={2}
          label={flash === 'off' ? 'Turn flash on' : 'Turn flash off'}
          icon={flash === 'off' ? 'flash-off' : 'flash'}
          unfold={unfold}
          active={active && open}
          fade={fade}
          onPress={onToggleFlash}
        />
        <Option
          index={1}
          label="Flip camera"
          icon="camera-flip"
          unfold={unfold}
          active={active && open}
          fade={fade}
          onPress={onFlip}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={open ? 'Hide camera options' : 'Camera options'}
          accessibilityState={{ expanded: open }}
          onPress={toggleOptions}
        >
          <Glass
            radius={BOTTOM_BAR.controlSize / 2}
            active={active}
            duration={DURATION.crossfade / 1000}
            style={styles.round}
          >
            <Animated.View style={[styles.glyph, dotsStyle]}>
              <Icon name="ellipsis" size={CAMERA.optionIcon} color={COLORS.text} />
            </Animated.View>
            <Animated.View style={[styles.glyph, closeStyle]}>
              <Icon name="close" size={BOTTOM_BAR.backIcon} color={COLORS.text} />
            </Animated.View>
          </Glass>
        </Pressable>
      </View>
    </SheetBar>
  );
}

const styles = StyleSheet.create({
  round: {
    width: BOTTOM_BAR.controlSize,
    height: BOTTOM_BAR.controlSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    position: 'absolute',
  },
  shutterSlot: {
    // Centred on the bar's line: taller than the bar, so it is pulled up by
    // half the difference rather than hanging off the bar's top edge.
    position: 'absolute',
    left: 0,
    right: 0,
    top: (BOTTOM_BAR.controlSize - CAMERA.shutterSize) / 2,
    alignItems: 'center',
  },
  shutter: {
    width: CAMERA.shutterSize,
    height: CAMERA.shutterSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDisc: {
    width: CAMERA.shutterSize - CAMERA.shutterPadding * 2,
    height: CAMERA.shutterSize - CAMERA.shutterPadding * 2,
    borderRadius: (CAMERA.shutterSize - CAMERA.shutterPadding * 2) / 2,
    backgroundColor: COLORS.text,
  },
  more: {
    width: BOTTOM_BAR.controlSize,
    height: BOTTOM_BAR.controlSize,
  },
  option: {
    // Over the ⋯ exactly; `unfold` is what moves it off.
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
