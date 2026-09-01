# Blurred Text Morph - Implementation Brief

A character-diffing text swap drawn through Skia. When the string changes,
characters shared with the previous string keep their identity and glide to their
new position; removed characters blur out and added characters blur in, each
staggered.

This animation is one component plus a screen that changes its `text` prop:

- `MorphingText.tsx`
- `App.tsx` (any control that swaps the string; a button is enough)

Skia is required, not incidental. Each glyph is its own `Group` so it can carry a
real Gaussian blur via `BlurMask`. `Animated.Text` cannot blur per glyph.

## Required packages

```tsx
@shopify/react-native-skia
react-native-reanimated
react-native-worklets
```

## Font loading

Any typeface works. The one hard requirement is that Skia takes the font file,
not a registered family name. A family loaded with `expo-font` is invisible to
`useFont`, and passing `fontFamily` renders nothing.

```tsx
// Pass the file through as a prop; the component should not pick a font.
const FONT = require('./YourFont.otf')

const font = useFont(FONT, fontSize)
```

`fontSource` is a required prop of `MorphingText` for exactly this reason: the
component has no business owning the typeface. Any required asset module is a
valid `DataSourceParam`: a local `.otf`/`.ttf`, or an `@expo-google-fonts/*`
export (those are already `require`'d `.ttf` modules), if you would rather not
bundle a file.

## Character identity

Key each character by its value plus its running occurrence count. This is what
makes the n-th `a` reconcile to the same glyph across a swap, which is what makes
the glide possible.

```tsx
function toKeyedChars(text: string): { char: string; key: string }[] {
  const counts: Record<string, number> = {}
  return [...text].map((char) => {
    const n = counts[char] ?? 0
    counts[char] = n + 1
    return { char, key: `${char}#${n}` }
  })
}
```

Keys are case-sensitive: `D` and `d` do not match. Keep the phrase set in one
case or nothing will glide.

## Layout from glyph advances

```tsx
const advances = font.getGlyphWidths(font.getGlyphIDs(text))
const total = advances.reduce((sum, w) => sum + w, 0)
let cursor = (width - total) / 2   // centre within the canvas

keyed.forEach((k, index) => {
  const w = advances[index] ?? 0
  // cell at x = cursor, width = w
  cursor += w
})
```

Use advances, not tight bounds. Tight bounds drop trailing spaces and side bearings.
Advances are indexed per character, so `[...text]` and `getGlyphIDs(text)` must
stay in step: keep strings ASCII. Spaces are fine; they carry a real advance and
draw nothing.

## Cell reconciliation

```tsx
interface Cell {
  key: string
  char: string
  x: number
  width: number
  index: number
  phase: 'present' | 'exit'
}
```

On every text change, merge the new string against the previous cell list:

```tsx
setCells((previous) => {
  const merged: Cell[] = [...nextByKey.values()]
  for (const old of previous) {
    if (nextByKey.has(old.key)) continue
    // Reuse the SAME object when already exiting, so memo bails out and the
    // exit animation is not restarted.
    merged.push(old.phase === 'exit' ? old : { ...old, phase: 'exit' })
  }
  return merged
})
```

Carrying already-exiting cells forward is what lets a glyph finish leaving across
several rapid text changes. A key that reappears simply becomes `present` again
with a new `x`.

## Per-glyph animation state

Four shared values, of which only three are ever animated:

```tsx
const gx = useSharedValue(x)      // layout position; glides independently
const motion = useSharedValue(0)  // spring: translate + scale
const fade = useSharedValue(0)    // timing: opacity + blur
const dir = useSharedValue(1)     // +1 entering, -1 leaving; set, never animated
```

`dir` only flips the sign of the offsets, so it costs nothing to step. Splitting
`motion` (spring) from `fade` (timing) keeps the bouncy travel while preventing a
spring overshoot from pushing opacity above 1.

## The state machine

Drive it off a real phase flip, never off mount:

```tsx
const appliedPhase = useRef<'present' | 'exit' | null>(null)
useEffect(() => {
  const phase = isExiting ? 'exit' : 'present'
  if (appliedPhase.current === phase) return
  appliedPhase.current = phase

  if (!isExiting) {
    dir.set(1)
    const delay = ENTER_DELAY_MS + charIndex * staggerMs
    motion.set(withDelay(delay, withSpring(1)))
    fade.set(withDelay(delay, withTiming(1, { duration: MOVE_DURATION })))
    return
  }

  dir.set(-1)
  const delay = charIndex * staggerMs
  motion.set(withDelay(delay, withTiming(0, { duration: EXIT_DURATION })))
  fade.set(
    withDelay(
      delay,
      withTiming(0, { duration: EXIT_DURATION }, (finished) => {
        if (finished) scheduleOnRN(onExited, cellKey)
      }),
    ),
  )
}, [isExiting, charIndex, staggerMs, cellKey, onExited])
```

Two things this gets right that a naive version does not:

1. A phase flip retargets the same shared values, so an interrupted glyph
   always ends consistent with its current phase.
2. The `appliedPhase` guard means an index-only change (letters moved, glyph
   survived) does not restart the enter animation toward a value already
   held.

## Removal

Removal rides the exit animation's completion, with a guard:

```tsx
const removeCell = useCallback((key: string) => {
  setCells((previous) => {
    const cell = previous.find((c) => c.key === key)
    if (!cell || cell.phase !== 'exit') return previous  // it came back
    return previous.filter((c) => c.key !== key)
  })
}, [])
```

Never use `setTimeout` for this. A pending timer fires after the glyph has
returned and deletes a visible letter.

## Derived transform

```tsx
const transform = useDerivedValue(() => {
  const settled = motion.get()
  const away = 1 - settled
  const leaving = dir.get() < 0
  return [
    { translateX: gx.get() + (leaving ? EXIT_RIGHT * away : 0) },
    { translateY: baselineY + (leaving ? -EXIT_UP : ENTER_RISE) * away },
    { scale: SHRINK + (1 - SHRINK) * settled },
  ]
})

const blur = useDerivedValue(() => blurMax * (1 - fade.get()))
```

`baselineY = height / 2 + fontSize * 0.34` centres the line vertically. Skia's
transform origin is the top-left, so pass `origin={{ x: glyphWidth / 2, y:
-fontSize * 0.34 }}` to scale around the glyph's own centre.

Shared values go straight into Skia props: no `createAnimatedComponent`, no
`useAnimatedProps`:

```tsx
<Group transform={transform} origin={origin} opacity={fade}>
  <SkiaText x={0} y={0} text={char} font={font} color={color} />
  <BlurMask blur={blur} style="normal" />
</Group>
```

## Auto-fitting the type

Size once to the widest string the canvas will ever show, so type does not resize
between phrases:

```tsx
const probeFont = useFont(fontSource, fontSize)
const fittedSize = useMemo(() => {
  if (!probeFont) return fontSize
  const candidates = fitTexts?.length ? fitTexts : [text]
  const widest = candidates.reduce((max, candidate) => {
    const advances = probeFont.getGlyphWidths(probeFont.getGlyphIDs(candidate))
    return Math.max(max, advances.reduce((sum, w) => sum + w, 0))
  }, 0)
  if (widest <= width || widest === 0) return fontSize
  return Math.floor(fontSize * (width / widest))
}, [probeFont, fitTexts, text, width, fontSize])

const font = useFont(fontSource, fittedSize)
```

Two font instances is the cost of an exact fit. A per-character heuristic either
clips a wide string or leaves a narrow one too small.

## Memoization

Pass primitives to the glyph component, not a `cell` object. A new object per
change defeats `memo` for every glyph in the string. With primitives, a glyph
whose `x`, `charIndex` and phase are unchanged does no React work when a
different glyph changes.

## Pre-load fallback

`useFont` is async. Render plain `<Text>` until it resolves, or the copy is
invisible on first paint.

## Phrase selection

Phrases should share letters but not be rearrangements of each other. Unrelated
phrases of similar length work best: enough letters survive to give the eye
something continuous to follow, and enough change that the blur is visible.

```tsx
const PHRASES = ['buttery smooth', 'gesture driven', 'sixty frames', 'feels native']
```

Perfect anagrams glide beautifully but never blur, since nothing enters or exits.

## Do not change these behaviors

- The enter animation is driven by a phase flip, never by mount.
- Already-exiting cells are carried forward by reference across text changes.
- Removal happens in the exit animation's completion callback, guarded on phase.
- The `appliedPhase` guard prevents index-only changes from restarting animations.
- Glyph props are primitives so `memo` can bail out.
- Layout uses glyph advances, never text bounds.
- Strings stay ASCII and single-case.
- `origin` is set so glyphs scale around their centre, not the baseline.
- Use `.get()` / `.set()` on shared values.
- Use `scheduleOnRN` for JS callbacks from animation completions.
