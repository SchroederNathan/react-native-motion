# Aurora Curtain - Implementation Brief

A curtain of violet light over the top of the screen, drawn entirely by one Skia
fragment shader. Nine overlapping rays swing, lean, and fade on their own clocks;
a 14-second master clock keeps every rate a whole number so the loop wraps with
no visible join. More of the field hides above the top edge than shows. Dragging
down is a ScrollView overscroll that slides the hidden part into view 1:1.

This animation is one component plus a dark host screen:

- `AuroraCurtain.tsx` (the shader, the loop driver, the overscroll drag)
- `App.tsx` (a `#0A0A0A` screen with a light status bar)

React's only job is three uniforms. No view is ever animated.

## Required packages

```tsx
@shopify/react-native-skia
react-native-reanimated
expo-status-bar
```

## Uniforms and constants

The shader takes three uniforms:

```tsx
type AuroraUniforms = {
  u_res: [number, number] // canvas size in points
  u_t: number             // loop phase, 0..1 over LOOP_MS, linear
  u_pull: number          // screen-heights the curtain is dragged down
}
```

JS-side constants:

```tsx
const LOOP_MS = 14000   // master loop
const MAX_PULL = 0.34   // drag clamp, screen-heights; must stay below TOP
```

Shader constants, all measured rather than chosen by eye:

```glsl
const float LAG = 0.2857;         // swing lag per screen-height, = 4.0s / 14.0s
const float FADE_A = -0.20;       // vertical falloff start (screen-heights)
const float FADE_B = 0.22;        // vertical falloff end
const float FADE_P = 0.55;        // falloff exponent: (1 - smoothstep)^0.55
const float TOP = 0.5;            // how far the field extends above the screen
const float EDGE_P = 1.6;         // ray edge softness
const float BOB_AMP = 0.01;       // per-ray fade-height drift
const float BREATHE_DEPTH = 0.88; // per-ray fade depth (down to 12%)
const float GAIN = 0.2664;        // peak alpha, fitted against the composited result
const float PULSE_DEPTH = 0.40;   // global swell, bright:dim of 1.60
const float BACKDROP = 0.0392;    // #0A0A0A, the ground the light is laid on
```

`GAIN` and `BREATHE_DEPTH` together set how filled the curtain looks. `GAIN` was
fitted over the near-black backdrop, not pure black; fitting over black and then
compositing reads a third too bright.

## The clocks

`u_t` advances evenly. Everything else derives from it inside the shader:

```glsl
// Warped clock: playback rate swells between ~0.5x and ~1.5x, so the field
// surges and lulls. Both offset rates are whole numbers, so tw still advances
// by exactly 1 per loop and the wrap survives.
float tw = t
         + 0.012 * sin((t * 3.0 + 0.37) * TAU)
         + 0.006 * sin((t * 7.0 + 0.71) * TAU);

// Lagged clock, shared by every ray so they all lean together.
float td = tw - ys * LAG;
```

`ys` is screen-heights below the curtain's own top edge:
`ys = fragCoord.y / u_res.y - u_pull`. The drag slides the whole field down.

The lag is the whole leaning mechanism. A ray's swing is read at a time lagged by
depth, so the ray leans and curves while moving and straightens as it settles,
and the lean always opposes the drift. No slant is drawn into the rays.

## One ray

A ray is a soft vertical band whose centre swings as the sum of two sines at
different rates, so it visibly speeds up and slows down:

```glsl
float swing = a1 * sin((td * s1 + p1) * TAU)
            + a2 * sin((td * s2 + p2) * TAU);
float f = 1.0 - smoothstep(0.0, halfWidth, abs(x - (base + swing)));
f = pow(f, EDGE_P);   // gentler than squaring; reads as blurred light

float yy = ys + BOB_AMP * sin((tw * bobSpeed + bobPhase) * TAU);
float fade = pow(1.0 - smoothstep(FADE_A, FADE_B, yy), FADE_P);

return f * fade * breathe(tw, brSpeed, brPhase, BREATHE_DEPTH) * weight;
```

`breathe` is an independent per-ray opacity cycle with two harmonics, so a ray
sometimes lingers bright and sometimes drops out early:

```glsl
float breathe(float t, float speed, float phase, float depth) {
  float TAU = 6.2831853;
  float w = 0.5 + 0.5 * sin((t * speed + phase) * TAU);
  w = clamp(w + 0.25 * sin((t * (speed * 2.0 + 1.0) + phase * 3.1) * TAU), 0.0, 1.0);
  return (1.0 - depth) + depth * w;
}
```

The falloff exponent matters: `(1 - smoothstep)^0.55` fits the measured vertical
profile to an RMS error of 0.008 because the real falloff is nearly linear
through its middle. A plain smoothstep is off by three times as much.

## The field

Nine rays, summed. Centres are scattered off the even lattice (0.000, 0.336,
0.165, 0.543, 0.366, 0.804, 0.816, 1.263, 1.035, averaging 0.15 apart) and the
widths vary widely. Both choices kill periodicity: evenly spaced rays put all
their energy at the spacing's frequency and read as vertical stripes. Nine
rather than eight because scattered this far, eight leave a gap at one edge.

Each call passes that ray's own centre, width, two swing amplitude/rate/phase
triples, bob rate and phase, breathe rate and phase, and weight. Every rate is a
whole number.

After the sum:

```glsl
// Soften the field's own top edge, so a deep drag never reveals a hard cut.
v *= smoothstep(-TOP, -TOP + 0.12, ys);

// Global swell on top of the per-ray fades.
v *= 1.0 + PULSE_DEPTH * sin(t * TAU);

// Soft-compress, never clamp: overlaps sum past 1.0, and a clamp would flatten
// them into solid patches. This keeps a gradient inside the bright spots.
float v2 = v / (1.0 + v);
float a = clamp(v2 * GAIN, 0.0, 1.0);
```

## Grain

```glsl
float g = (1.0 - smoothstep(0.11, 0.28, ys))
        * smoothstep(-TOP, -TOP + 0.12, ys);
a += (hash(floor(fragCoord / 0.5)) - 0.5) * 0.055 * (0.55 * g + 0.45 * v2);
a = clamp(a, 0.0, 1.0);
```

Three things this encodes:

1. Fixed cells via `floor(fragCoord / 0.5)`, not per-pixel noise. Per-pixel hash
   averages away under any downscale; larger cells read as chunky blocks.
2. Amplitude 0.055 is calibrated against a measured 2.1/255 of high-frequency
   residual, allowing for what h264 re-encoding eats.
3. The `g` term biases grain into the dark areas, where alpha clamps at 0 and
   only the positive half of the noise survives. It fades out before the field's
   edges, or grain past the light would end in a visible line. The grain also
   dithers the low-alpha gradients so they do not band.

## Tint

Violet everywhere: blue > red > green at every column. What varies across the
width is how strong the cast is, not the hue:

```glsl
float m = 0.5 + 0.5 * sin((x * 1.5 + t) * TAU);
float3 tint = mix(float3(0.840, 0.810, 1.000), float3(0.930, 0.905, 1.000), m);

float3 color = float3(BACKDROP) * (1.0 - a) + tint * a;
```

The `t` term keeps the strong and weak columns slowly trading places, again at a
whole-number rate.

## Driving the loop

```tsx
const AURORA_SHADER = Skia.RuntimeEffect.Make(AURORA_SKSL)  // module scope; null on error

const phase = useSharedValue(0)

useEffect(() => {
  if (reducedMotion) {
    phase.set(0.18)   // park on a static frame
    return
  }

  phase.set(0)
  phase.set(
    withRepeat(
      withTiming(1, { duration: LOOP_MS, easing: Easing.linear }),
      -1,
      false,
    ),
  )

  return () => {
    cancelAnimation(phase)
    phase.set(0)
  }
}, [phase, reducedMotion])
```

`Easing.linear` and `reverse: false` are load-bearing. The shader's whole-number
rates only cancel out if `u_t` advances evenly and jumps 1 to 0. Inside a
navigator, drive this from a focus effect so the repeat stops off-screen.

## The drag

An empty, transparent `Animated.ScrollView` sits over the canvas. It exists only
to turn a drag into an overscroll, so the bounce, rubber-banding, and settle back
are the platform's scroll physics rather than a spring imitating them.

```tsx
const MAX_PULL = 0.34

const onScroll = useAnimatedScrollHandler((event) => {
  const over = Math.max(0, -event.contentOffset.y) / Math.max(height, 1)
  pull.set(Math.min(MAX_PULL, over))
})
```

```tsx
<Animated.ScrollView
  alwaysBounceVertical
  contentContainerStyle={{ flexGrow: 1 }}
  onScroll={onScroll}
  scrollEventThrottle={16}
  showsVerticalScrollIndicator={false}
  style={StyleSheet.absoluteFill}
/>
```

- Only negative `contentOffset.y` counts, so normal downward scrolling leaves
  the curtain alone.
- `alwaysBounceVertical` plus `flexGrow: 1` content is required, or an empty
  scroll view never bounces and the offset never goes negative.
- iOS only in effect: Android overscrolls with a stretch/glow and keeps
  `contentOffset` at 0, so there the curtain stays put.
- `MAX_PULL` (0.34) stays under the shader's `TOP` (0.5), so a drag can never
  expose the field's own top edge.

## Render

Uniforms are one derived value fed straight into `<Shader>`. Loop and drag both
update on the UI thread with no re-renders:

```tsx
const uniforms = useDerivedValue(() => ({
  u_res: [width, height],
  u_t: phase.get(),
  u_pull: pull.get(),
}))

if (!AURORA_SHADER) {
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0A0A0A' }]} />
}

return (
  <View style={StyleSheet.absoluteFill}>
    <Canvas accessible accessibilityRole="image" style={StyleSheet.absoluteFill}>
      <Fill>
        <Shader source={AURORA_SHADER} uniforms={uniforms} />
      </Fill>
    </Canvas>
    {/* the transparent ScrollView goes here, on top */}
  </View>
)
```

The host screen's background must be `#0A0A0A`, the same grey as `BACKDROP`, so
there is no seam anywhere the canvas does not cover and the fitted `GAIN` still
reads correctly.

## Do not change these behaviors

- Every rate in the shader is a whole-number multiple of the loop, including the
  warped-clock offsets and the tint drift. The invisible wrap depends on it.
- `LAG` is expressed against `LOOP_MS` (4.0 / 14.0); rescale it if the loop
  length changes.
- The loop uses `Easing.linear` with a non-reversing infinite repeat.
- The ray sum is soft-compressed with `v / (1 + v)`, never clamped.
- The lean comes only from the lagged clock; no slant is drawn into the rays.
- Grain cells are `floor(fragCoord / 0.5)` at amplitude 0.055.
- The drag reads only negative `contentOffset.y`, clamped to `MAX_PULL` (0.34),
  which stays below `TOP` (0.5).
- The backdrop inside and outside the canvas is `#0A0A0A`.
- Compile the shader once at module scope and fall back to a plain backdrop when
  `Skia.RuntimeEffect.Make` returns null.
- Cancel the animation on cleanup; reduced motion parks the phase at 0.18.
- Use `.get()` / `.set()` on shared values.
