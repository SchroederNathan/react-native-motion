import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedScrollHandler,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const LOOP_MS = 14000;

/**
 * A curtain of light draped over the top of the screen, rays rippling as if in
 * a slow breeze, with more of it hidden above the top edge than is on show.
 * Drag down and the hidden part follows your finger into view.
 *
 * Every constant here was measured off a real curtain rather than chosen by eye,
 * and the notes at each one say what the measurement was. The four that matter
 * most:
 *
 *   - the light is a plateau above the screen's top edge which falls to nothing
 *     by 0.235 screen-heights below it, half-bright at 0.13, and the falloff is
 *     close to linear through its middle rather than an S-curve,
 *   - it is violet throughout — blue > red > green — never green or warm,
 *   - the rays lean, and the lean always opposes the direction the field is
 *     drifting, which is why it comes from a time lag down each ray instead of
 *     a slant drawn into them,
 *   - nothing about the field is periodic. Evenly spaced rays put all their
 *     energy at the spacing's frequency and read as regularly spaced vertical
 *     lines; the real thing has a horizontal spectrum that decays smoothly with
 *     no peak anywhere, so the centres are scattered and the widths vary widely.
 *
 * Every speed is a whole-number multiple of the master clock, so the 14-second
 * loop is seamless with a linear, non-reversing repeat.
 */
const AURORA_SKSL = `
uniform float2 u_res;
uniform float  u_t;
uniform float  u_pull;   // screen-heights the curtain has been dragged down

// How far the swing lags per screen-height down a ray, in loop-normalised time.
// Measured at 4.0s per screen-height: the rays' lean flips sign exactly when the
// field's drift reverses, and lean/drift-velocity is consistently ~4s. Expressed
// against LOOP_MS, so this is 4.0 / 14.0 and has to be rescaled if that changes.
const float LAG = 0.2857;

// Vertical falloff. (1 - smoothstep)^0.55 fits the measured profile to an RMS
// error of 0.008, where a plain smoothstep is off by three times as much because
// the real falloff is nearly linear through its middle. The endpoints are a
// little wider than the raw measurement to allow for the soft-compress below,
// which flattens the bright end.
const float FADE_A = -0.20;
const float FADE_B = 0.22;
const float FADE_P = 0.55;

// How far up the light extends before the field itself fades out. The drag is
// clamped to less than this, so the top edge never comes into view.
const float TOP = 0.5;

const float EDGE_P = 1.6;        // ray edge softness
const float BOB_AMP = 0.01;      // per-ray fade-height drift, screen-heights

// How far each ray fades: 0.88 takes it down to 12% and back. With GAIN this
// sets how FILLED the curtain looks, and they are the two to re-derive if that
// ever reads wrong. The measure is min/mean of the horizontal profile — how dark
// the gaps go relative to the average — and it wants to land near 0.69.
const float BREATHE_DEPTH = 0.88;

// Peak alpha, fitted against the composited result rather than the light on its
// own. The distinction is worth a third of the brightness: fitted over pure
// black and then laid on a near-black background, the light comes out far too
// bright and the gaps wash out.
const float GAIN = 0.2664;
const float PULSE_DEPTH = 0.40;  // global swell, measured bright:dim of 1.60

// The ground the light is laid on, as a grey level. Near-black rather than black
// because that is what it was tuned against; on pure black the same GAIN reads a
// little dim.
const float BACKDROP = 0.0392;   // #0A0A0A

float hash(float2 p) {
  return fract(sin(dot(p, float2(12.9898, 78.233))) * 43758.5453);
}

// Independent opacity cycle per ray. Two harmonics rather than one: a single
// sine fades in and out like a metronome, while the faster second harmonic makes
// a ray sometimes linger bright and sometimes drop out early, so the fades read
// as unplanned. Its rate stays a whole number, keeping the loop seamless.
float breathe(float t, float speed, float phase, float depth) {
  float TAU = 6.2831853;
  float w = 0.5 + 0.5 * sin((t * speed + phase) * TAU);
  w = clamp(w + 0.25 * sin((t * (speed * 2.0 + 1.0) + phase * 3.1) * TAU), 0.0, 1.0);
  return (1.0 - depth) + depth * w;
}

// One ray: a soft band hanging straight DOWN at rest. Its centre swings side to
// side, and because the swing is read at a lagged time further down the ray (td
// already carries the lag), the ray leans and curves while it moves and
// straightens as it settles. There is deliberately no built-in slant — every bit
// of visible angle comes out of the drag.
//
// Two swing components per ray at different rates: one sine oscillates at a
// single constant rate, while summing two makes the ray visibly speed up and
// slow down. Every ray gets its own pair, so no two move alike.
//
// ys is measured in screen-heights from the screen's top edge, so it is negative
// in the part of the curtain hidden above the screen.
float ray(float x, float ys, float td, float tw, float base, float halfWidth,
          float a1, float s1, float p1,
          float a2, float s2, float p2,
          float bobSpeed, float bobPhase,
          float brSpeed, float brPhase, float weight) {
  float TAU = 6.2831853;
  float swing = a1 * sin((td * s1 + p1) * TAU)
              + a2 * sin((td * s2 + p2) * TAU);
  float f = 1.0 - smoothstep(0.0, halfWidth, abs(x - (base + swing)));
  // Gentler than squaring, so a wide ray reads as blurred light rather than a
  // band with a visible boundary.
  f = pow(f, EDGE_P);

  // Each ray fades out at its own height and that height drifts, so the ray
  // lengthens and shortens. Kept small: the real curtain has almost the same
  // horizontal contrast at every depth, and a large bob scallops the lower edge
  // into separate lobes.
  float yy = ys + BOB_AMP * sin((tw * bobSpeed + bobPhase) * TAU);
  float fade = pow(1.0 - smoothstep(FADE_A, FADE_B, yy), FADE_P);

  return f * fade * breathe(tw, brSpeed, brPhase, BREATHE_DEPTH) * weight;
}

half4 main(float2 fragCoord) {
  float TAU = 6.2831853;

  float x = fragCoord.x / u_res.x;
  // Screen-heights below the curtain's own top edge. The drag slides the whole
  // field down, which is what brings the hidden part into view.
  float ys = fragCoord.y / u_res.y - u_pull;

  float t = u_t;

  // Warped clock for all motion. u_t advances evenly; adding two periodic
  // offsets makes the effective playback rate swell between roughly 0.5x and
  // 1.5x, so the field surges and lulls instead of drifting at one flat speed.
  // Both offset rates are whole numbers, so tw still advances by exactly 1 per
  // loop and the seamless wrap survives.
  float tw = t
           + 0.012 * sin((t * 3.0 + 0.37) * TAU)
           + 0.006 * sin((t * 7.0 + 0.71) * TAU);

  // The lagged clock, shared by every ray so they all lean together.
  float td = tw - ys * LAG;

  // Nine rays, heavily overlapping — each 0.17 to 0.44 wide while their centres
  // average 0.15 apart, so every ray overlaps three or four neighbours. That
  // overlap is what keeps the curtain shallow: the real horizontal profile only
  // varies between 0.69x and 1.37x its own mean, and rays narrow enough to stand
  // apart cannot be that even.
  //
  // The centres are deliberately off the even lattice, and the widths vary far
  // more than looks necessary. Both are there to kill periodicity — see the note
  // at the top. Nine rather than eight because scattered this far, eight leave a
  // gap at one edge.
  float v = 0.0;
  v += ray(x, ys, td, tw, 0.000, 0.300, 0.0665, 3.0, 0.00, 0.0266, 2.0, 0.20, 1.0, 0.00, 1.0, 0.00, 0.85);
  v += ray(x, ys, td, tw, 0.336, 0.210, 0.0546, 3.0, 0.37, 0.0315, 2.0, 0.62, 2.0, 0.35, 2.0, 0.17, 0.90);
  v += ray(x, ys, td, tw, 0.165, 0.435, 0.0735, 3.0, 0.68, 0.0224, 4.0, 0.15, 1.0, 0.70, 1.0, 0.33, 0.86);
  v += ray(x, ys, td, tw, 0.543, 0.255, 0.0595, 3.0, 0.15, 0.0287, 2.0, 0.85, 2.0, 0.10, 3.0, 0.50, 0.88);
  v += ray(x, ys, td, tw, 0.366, 0.375, 0.0630, 3.0, 0.52, 0.0252, 2.0, 0.40, 1.0, 0.45, 2.0, 0.67, 0.84);
  v += ray(x, ys, td, tw, 0.804, 0.165, 0.0504, 3.0, 0.83, 0.0336, 4.0, 0.70, 2.0, 0.80, 1.0, 0.83, 0.89);
  v += ray(x, ys, td, tw, 0.816, 0.345, 0.0700, 3.0, 0.26, 0.0238, 2.0, 0.05, 1.0, 0.20, 2.0, 0.42, 0.87);
  v += ray(x, ys, td, tw, 1.263, 0.225, 0.0574, 3.0, 0.60, 0.0301, 2.0, 0.95, 2.0, 0.55, 3.0, 0.92, 0.85);
  v += ray(x, ys, td, tw, 1.035, 0.405, 0.0616, 3.0, 0.44, 0.0259, 4.0, 0.28, 1.0, 0.90, 2.0, 0.08, 0.86);

  // Soften the field's own top edge, so dragging further than expected can never
  // reveal a hard cut where it ends.
  v *= smoothstep(-TOP, -TOP + 0.12, ys);

  // Global swell: the whole curtain brightens and dims by a factor of 1.60 over
  // the loop, on top of the per-ray fades.
  v *= 1.0 + PULSE_DEPTH * sin(t * TAU);

  // Soft-compress rather than clamp. The rays are summed, so wherever several
  // overlap the total runs past 1.0 and a clamp would flatten it into a solid
  // patch with no gradient left inside. This rolls off asymptotically instead:
  // overlaps still read brighter than a lone ray, but nothing reaches a ceiling,
  // so the light keeps its internal shape.
  float v2 = v / (1.0 + v);
  float a = clamp(v2 * GAIN, 0.0, 1.0);

  // Grain, matched to the real curtain's noise, which also dithers the large
  // low-alpha gradients so they do not band on a phone display.
  //
  // Cells are 2 physical pixels rather than per-pixel: the grain has to stay
  // visible when the screen is viewed below native resolution, and 1px hash
  // noise averages away under any downscale. 3px cells read as chunky blocks.
  //
  // 0.055 is calibrated: the measured curtain carries 2.1/255 of high-frequency
  // residual, and re-encoding these frames through the same h264 path a screen
  // recording uses (which eats about a fifth of it) puts 0.055 at 2.15.
  //
  // The floor term keeps most of the grain in the dark areas, where alpha clamps
  // at 0 so only the positive half of the noise survives — exactly the dark-area
  // speckle the real thing shows. It is faded out before the field's edges, or
  // grain past the light would end in a visible line.
  float g = (1.0 - smoothstep(0.11, 0.28, ys))
          * smoothstep(-TOP, -TOP + 0.12, ys);
  a += (hash(floor(fragCoord / 0.5)) - 0.5) * 0.055 * (0.55 * g + 0.45 * v2);
  a = clamp(a, 0.0, 1.0);

  // The light is violet, and violet everywhere. Measured across the full width,
  // blue always leads red by 1.9-4.6/255 and green always trails red by about
  // 1/255 — a desaturated periwinkle, with no green-leaning or warm rays at all.
  // The two mix ends are the strong and weak ends of that same violet, so what
  // varies across the width is how much cast the light carries, not its hue.
  // x * 1.5 puts about one and a half cycles across, matching how far apart the
  // most and least violet columns sit; the t term keeps them slowly trading
  // places at a whole-number rate.
  float m = 0.5 + 0.5 * sin((x * 1.5 + t) * TAU);
  float3 tint = mix(float3(0.840, 0.810, 1.000), float3(0.930, 0.905, 1.000), m);

  float3 color = float3(BACKDROP) * (1.0 - a) + tint * a;
  return half4(color.r, color.g, color.b, 1.0);
}
`;

const AURORA_SHADER = Skia.RuntimeEffect.Make(AURORA_SKSL);

// How far the curtain can be dragged down, in screen-heights. Comfortably inside
// the hidden part above the screen (TOP in the shader), so a drag never exposes
// the field's own top edge. A rubber-banded overscroll gets nowhere near it.
const MAX_PULL = 0.34;

export function AuroraCurtain() {
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const phase = useSharedValue(0);
  const pull = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      if (reducedMotion) {
        phase.set(0.18);
        return;
      }

      phase.set(0);
      phase.set(
        withRepeat(
          withTiming(1, { duration: LOOP_MS, easing: Easing.linear }),
          -1,
          false,
        ),
      );

      return () => {
        cancelAnimation(phase);
        phase.set(0);
      };
    }, [phase, reducedMotion]),
  );

  // The curtain follows a scroll view's overscroll rather than a pan of its own.
  // That is how it behaves in an app — it hangs behind a scrolling screen, and
  // dragging past the top draws the hidden part down with the content, 1:1 — and
  // it means the bounce, the rubber-banding and the settle back are the platform
  // scroll physics rather than a spring standing in for them.
  //
  // Only overscroll counts: contentOffset.y goes negative when dragged past the
  // top, and scrolling down normally leaves the curtain where it is.
  //
  // iOS only, in the sense that Android overscrolls with a stretch/glow and keeps
  // contentOffset at 0, so there the curtain simply stays put.
  const onScroll = useAnimatedScrollHandler((event) => {
    const over = Math.max(0, -event.contentOffset.y) / Math.max(height, 1);
    pull.set(Math.min(MAX_PULL, over));
  });

  const uniforms = useDerivedValue(() => ({
    u_res: [width, height],
    u_t: phase.get(),
    u_pull: pull.get(),
  }));

  if (!AURORA_SHADER) {
    return <View style={[StyleSheet.absoluteFill, styles.fallback]} />;
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <Canvas
        accessible
        accessibilityLabel="Animated curtain of violet light across the top of the screen."
        accessibilityRole="image"
        style={StyleSheet.absoluteFill}
      >
        <Fill>
          <Shader source={AURORA_SHADER} uniforms={uniforms} />
        </Fill>
      </Canvas>

      {/* Empty and transparent: it exists only to turn a drag into an
          overscroll the curtain can follow. */}
      <Animated.ScrollView
        alwaysBounceVertical
        contentContainerStyle={styles.scrollContent}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: '#0A0A0A',
  },
  scrollContent: {
    flexGrow: 1,
  },
});
