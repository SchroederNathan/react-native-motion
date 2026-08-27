import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';
import Animated, { type AnimatedProps } from 'react-native-reanimated';
import { COLORS } from './constants';

/** True on iOS 26+, where `expo-glass-effect` renders the real material. */
const LIQUID_GLASS = isLiquidGlassAvailable();

/**
 * Whether a `BlurView` here actually samples what is behind it.
 *
 * On iOS it always does. On Android it never does in this screen: the blur is
 * a view that copies its own window's contents, and the sheet is hosted over
 * the keyboard in a window of its own — so what it finds behind itself is
 * nothing, and it comes out as the tint alone over whatever really shows
 * through. Surfaces below fall back to the flat colour they were measured at.
 */
const BLURS_ITS_BACKDROP = Platform.OS !== 'android';

const AnimatedGlassView = Animated.createAnimatedComponent(GlassView);

export type GlassStyleName = 'regular' | 'none';

/**
 * A `GlassView` cannot be brought in or out by animating opacity — put one
 * under an animated `opacity` and it renders nothing at all. It has its own
 * native transition for exactly this, so every glass surface here is mounted
 * at a fixed opacity and switched between styles instead.
 *
 * `target` is where it should end up; the first render always starts at `none`
 * so the transition has somewhere to come from.
 */
function useGlassStyle(target: GlassStyleName, duration: number) {
  const [style, setStyle] = useState<GlassStyleName>('none');
  useEffect(() => setStyle(target), [target]);
  return { style, animate: true, animationDuration: duration };
}

/**
 * Shape without a clip. `overflow: 'hidden'` is deliberately absent: the native
 * view rounds itself off its own `borderRadius`, and clipping it is what stops
 * an interactive glass surface from rendering the bulge it makes under a
 * finger. Anything laid over the material carries its own radius instead.
 */
function shapeOf(radius: number): ViewStyle {
  return { borderRadius: radius, borderCurve: 'continuous' };
}

export interface GlassProps extends ViewProps {
  /**
   * Fill for the `expo-blur` stand-in only. Lets a surface wear real glass on
   * iOS 26 while keeping the colour it was measured at below it.
   */
  fallbackTint?: string;
  /** Corner radius; the native view rounds the material to it. */
  radius?: number;
  /** Whether the glass is showing. Transitions natively, never by opacity. */
  active?: boolean;
  /**
   * Whether the material reacts to a press. True for a control; false for a
   * container, which should not bulge under a finger aiming at something
   * inside it.
   */
  interactive?: boolean;
  /** Transition length in seconds. */
  duration?: number;
  children?: ReactNode;
}

/**
 * A glass surface: the ‹ button, the bottom-right pill, the composer bar and
 * its send button.
 *
 * Interactive by default, so the material reacts to a press the way every
 * other iOS 26 glass control does. That reaction draws outside the view's
 * bounds, which is why neither this nor any of its ancestors clips.
 */
export function Glass({
  fallbackTint,
  radius = 0,
  active = true,
  interactive = true,
  duration = 0.25,
  style,
  children,
  ...rest
}: GlassProps) {
  const glassEffectStyle = useGlassStyle(active ? 'regular' : 'none', duration);

  if (!LIQUID_GLASS) {
    return (
      <BlurView
        intensity={60}
        tint="systemChromeMaterialDark"
        // The fallback is a blur, and a blur does have to clip to its shape.
        style={[shapeOf(radius), styles.clip, style]}
        {...rest}
      >
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: fallbackTint ?? COLORS.controlScrim },
          ]}
        />
        {children}
      </BlurView>
    );
  }

  return (
    <GlassView
      glassEffectStyle={glassEffectStyle}
      colorScheme="dark"
      isInteractive={interactive}
      style={[shapeOf(radius), style]}
      {...rest}
    >
      {children}
    </GlassView>
  );
}

/**
 * The frosted material the menu is made of — real liquid glass where the OS has
 * it. In the reference the suggestion rows and the composer behind it go past
 * legibility, the keyboard's key grid stays faintly visible through the bottom,
 * and the whole panel sits at rgb(30,30,30) over black. `expo-blur` stands in
 * below iOS 26, tuned to that same measurement.
 *
 *
 * `style` carries the panel's live corner radius: the material rounds itself
 * rather than being clipped by the panel, so it can still bulge under a press.
 * It stays in the touch path — `isInteractive` only ever sees a finger on a
 * view that can be touched — which also means a tap on the menu's own padding
 * no longer falls through to the dismiss backdrop behind it. The rows sit above
 * it and still take their own taps.
 */
export function PanelMaterial({
  variant,
  duration,
  style,
}: {
  variant: 'regular' | 'none';
  duration: number;
  /** Animated: the panel drives the material's corner radius through this. */
  style?: AnimatedProps<ViewProps>['style'];
}) {
  const glassEffectStyle = useGlassStyle(variant, duration);

  if (!LIQUID_GLASS) {
    if (variant === 'none') return null;
    return (
      <Animated.View pointerEvents="none" style={[styles.clip, style]}>
        {BLURS_ITS_BACKDROP ? (
          <BlurView
            intensity={70}
            tint="systemUltraThinMaterialDark"
            style={StyleSheet.absoluteFill}
          >
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.fallbackTint]} />
          </BlurView>
        ) : (
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flatMaterial]} />
        )}
      </Animated.View>
    );
  }

  return (
    <AnimatedGlassView
      glassEffectStyle={glassEffectStyle}
      colorScheme="dark"
      isInteractive
      style={[styles.shape, style]}
    />
  );
}

const styles = StyleSheet.create({
  shape: {
    borderCurve: 'continuous',
  },
  clip: {
    overflow: 'hidden',
  },
  fallbackTint: {
    backgroundColor: COLORS.material,
  },
  flatMaterial: {
    backgroundColor: COLORS.materialFlat,
  },
});
