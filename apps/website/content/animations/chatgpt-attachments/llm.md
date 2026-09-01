# Attachment Menu - Implementation Brief

One glass panel opens out of the composer's + button, becomes a five-row menu, morphs into a full-bleed photo grid (or a camera), and collapses back into the + while copies of the picked photos fly into the composer. It is the same surface the whole way through; nothing hands off between views.

The pieces:

- `constants.ts`: measured geometry, springs, `sheetTopFromComposerBottom`, `mix`
- `Glass.tsx`: `Glass` (controls) and `PanelMaterial` (the panel's surface), with fallbacks
- `useSheetGeometry.ts`: keyboard-driven layout, `composerBottom`, grid size
- `useAttachmentPanel.ts`: the panel's state machine and shared values
- `useAttachmentFlights.ts`: attachments, flights, `attach` and `strip` shared values
- `AttachmentPanel.tsx`: the morphing surface itself
- `AttachmentMenu.tsx`: the five menu rows
- `PhotoGrid.tsx` / `PhotoCell.tsx`: FlashList grid with `measureCell` and selection badges
- `Composer.tsx`: the input bar with strip, + glyph, and thumbnails
- `AttachmentFlight.tsx`: the flying photo copies
- `SheetBar.tsx` / `PhotoGridBar.tsx` / `CameraBar.tsx`: floating glass controls, outside the panel
- `CameraSheet.tsx`: the camera preview in the grid's footprint

## Required packages

```tsx
react-native-reanimated
react-native-worklets
react-native-keyboard-controller
react-native-safe-area-context
expo-glass-effect
expo-blur
expo-image
expo-haptics
expo-media-library
expo-camera
@shopify/flash-list
```

## Data shapes and constants

```tsx
interface LibraryPhoto { id: string } // ph:// or content:// uri; expo-image loads it directly

interface Frame { x: number; y: number; w: number; h: number } // window coordinates

interface Flight {
  photo: LibraryPhoto
  from: Frame        // the cell's rect on the frame the flight starts
  slot: number       // composer slot index it lands on
  fromRadius?: number // grid cell hairline by default; the sheet's own for a camera capture
}

type Mode = 'closed' | 'menu' | 'photos' | 'camera'
type Sheet = 'photos' | 'camera' // outlives mode so back-to-menu doesn't flash the other sheet
```

Key numbers (all measured off a @3x recording of the real picker):

```tsx
const GUTTER = 12
const COMPOSER = {
  radius: 24, rowHeight: 48, rowPaddingLeft: 14, plusHit: 30, plusWell: 34,
  keyboardGap: 12, stripPaddingTop: 8, stripGap: 7,
  thumbSize: 115, thumbRadius: 18, thumbGap: 7, plusSlide: 16,
}
const PLUS_CENTER_X = GUTTER + COMPOSER.rowPaddingLeft + COMPOSER.plusHit / 2
const COMPOSER_STRIP_HEIGHT = 8 + 115 + 7

const MENU = { width: 280, itemHeight: 66, paddingVertical: 12, radius: 46, centerOffset: 7 }
const MENU_HEIGHT = 66 * 5 + 24 // 354

const GRID = { columns: 3, gap: 1.5, cellRadius: 2, panelRadius: 52 }

const SPRING = {
  panel: { duration: 400, dampingRatio: 0.8 },   // everything the panel does on the way in
  panelOut: { duration: 400, dampingRatio: 1 },  // every close; no overshoot past the + button
  attach: { duration: 400 },                     // grid → composer slot
  strip: { duration: 400 },                      // composer growing around the strip
}
const DURATION = { panel: 400, crossfade: 150, blur: 160, plusLead: 30 }
const EASE_FADE = Easing.out(Easing.quad)
```

Two shared helpers everything must agree on:

```tsx
function sheetTopFromComposerBottom(bottom: number) {
  'worklet'
  return bottom - COMPOSER.rowHeight / 2 + MENU.centerOffset - MENU_HEIGHT / 2
}

function mix(t: number, a: number, b: number) {
  'worklet'
  return a + (b - a) * t
}
```

Panel contents share one layout contract: laid out at natural size, anchored top-left, scaled by the panel.

```tsx
const PANEL_CONTENT = { position: 'absolute', left: 0, top: 0, transformOrigin: 'top left' } as const
```

## Glass rules

Three rules drive every glass decision:

1. A `GlassView` under an animated opacity renders nothing at all, even at opacity 1. Never fade glass; switch its `glassEffectStyle` between `'regular'` and `'none'` with the native transition. Fade only children drawn inside it.
2. Interactive glass draws its rim and press bulge outside its bounds. No `overflow: 'hidden'` on the glass or any ancestor. Shape comes from `borderRadius` + `borderCurve: 'continuous'` alone.
3. Fallbacks: below iOS 26, `expo-blur` tuned to the measured material. On Android the sheet lives in an over-keyboard window, a blur there samples nothing, so use the flat measured fill `#1E1E1E`.

```tsx
function useGlassStyle(target: 'regular' | 'none', duration: number) {
  const [style, setStyle] = useState<'regular' | 'none'>('none') // first render at 'none'
  useEffect(() => setStyle(target), [target])
  return { style, animate: true, animationDuration: duration }
}
```

`Glass` wraps controls (`isInteractive` by default) with a `fallbackTint` for the blur stand-in. `PanelMaterial` is the panel's surface: an `Animated.createAnimatedComponent(GlassView)` whose style carries the panel's live corner radius.

## Keyboard geometry

The keyboard is up the whole time and everything is positioned off it. `useSheetGeometry` returns:

```tsx
const keyboard = useReanimatedKeyboardAnimation()
const liftedBy = useDerivedValue(
  () => Math.max(-keyboard.height.get(), insets.bottom) + COMPOSER.keyboardGap,
)
const composerBottom = useDerivedValue(() => height - liftedBy.get())
const composerStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -liftedBy.get() }] }))
```

The grid needs plain numbers, so a `useKeyboardHandler` `onEnd` bridges the settled keyboard height to React state, and:

```tsx
const settledBottom = height - Math.max(settledKeyboard, insets.bottom) - COMPOSER.keyboardGap
const panelTop = sheetTopFromComposerBottom(settledBottom)
const gridWidth = width - GUTTER * 2
const gridHeight = height - panelTop - GUTTER
```

The sheet renders inside `<OverKeyboardView visible={mode !== 'closed'}>` so it can overlap the keyboard.

## Panel state machine

`useAttachmentPanel` owns `mode`, `sheet`, `closing`, and six shared values: `open`, `morph`, `plusOut`, `menuOpacity`, `gridOpacity`, `blur`.

Opening runs in two beats. The + glyph slides out first, alone; the panel mounts only after a 30ms lead, because the panel opens as a 34pt circle around a glyph it would otherwise cover.

```tsx
const openMenu = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  plusOut.set(withSpring(1, SPRING.panel))
  morph.set(0); gridOpacity.set(0); menuOpacity.set(1); blur.set(1)
  leadTimer.current = setTimeout(() => {
    leadTimer.current = null
    setMode('menu')
    open.set(withSpring(1, SPRING.panel)) // a spring holds small long enough to read the circle
    blur.set(withTiming(0, { duration: DURATION.blur, easing: EASE_FADE }))
  }, DURATION.plusLead)
}
```

Dismiss reverses it on `SPRING.panelOut` (no bounce), sets `closing: true` so the material starts its own native fade, and delays `plusOut` by the same lead. The `open` spring's completion calls `closeSheet`, which unmounts the sheet and calls `KeyboardController.setFocusTo('current')`. Tearing down the over-keyboard window otherwise drops the keyboard while the field stays logically focused, and it never comes back.

Menu → sheet is one morph for both destinations (the camera takes the grid's exact footprint):

```tsx
const showSheet = (next: Sheet) => {
  setSheet(next); setMode(next); pulseBlur()
  morph.set(withSpring(1, SPRING.panel))
  menuOpacity.set(withTiming(0, { duration: DURATION.crossfade, easing: EASE_FADE }))
  gridOpacity.set(withTiming(1, { duration: DURATION.crossfade, easing: EASE_FADE }))
}
```

`pulseBlur` softens then sharpens a blur layer inside the panel on every change (60ms up, 160ms down). `backToMenu` is `showSheet` in reverse. `collapseForLeave` / `resetAfterLeave` are the halves the flights drive: collapse without a completion callback, then reset everything once the flight lands (`plusOut` is untouched because the + already came back on its own spring).

## The morphing panel

`AttachmentPanel` derives one rect from three drivers and renders three layers.

```tsx
const rect = useDerivedValue(() => {
  const bottom = composerBottom.get()
  const plusCenter = bottom - COMPOSER.rowHeight / 2
  const top = sheetTopFromComposerBottom(bottom)

  // morph: menu shape → grid shape. Left and top edges never move.
  const m = morph.get()
  let x = GUTTER, y = top
  let w = mix(m, MENU.width, gridWidth)
  let h = mix(m, MENU_HEIGHT, screenHeight - top - GUTTER)
  let r = mix(m, MENU.radius, GRID.panelRadius)

  // open: the circle around the + → whatever morph says.
  const o = open.get()
  const well = COMPOSER.plusWell
  x = mix(o, PLUS_CENTER_X - well / 2, x)
  y = mix(o, plusCenter - well / 2, y)
  w = mix(o, well, w); h = mix(o, well, h); r = mix(o, well / 2, r)

  return { x, y, w, h, r }
})
```

Layer order, all inside an absolutely positioned wrapper driven by `rect`:

1. `PanelMaterial` with `StyleSheet.absoluteFill` plus an animated `borderRadius`. Never clipped, never opacity-animated.
2. A clipping sibling (`overflow: 'hidden'`, same animated radius) holding the menu wrapper, the grid wrapper, and the blur pulse layer.
3. Each content wrapper carries its real size (`MENU.width × MENU_HEIGHT`, `gridWidth × gridHeight`) and scales by `rect.w / naturalWidth` from the top-left. Real size matters: iOS drops touches outside a view's bounds.

Every inner opacity is multiplied by `openFade = interpolate(open, [0.12, 0.6], [0, 1], CLAMP)` so the circle reads before content arrives. `pointerEvents` comes from an `interactive: 'menu' | 'grid' | 'none'` prop, because a faded-out layer still swallows taps.

## Menu and grid content

`AttachmentMenu` is five plain pressable rows (Camera, Photos, Files, Plugins, Think harder) with no background and no size logic; the panel owns the glass and the panel scales the rows. Its root wears `PANEL_CONTENT`.

`PhotoGrid` is a 3-column FlashList at the sheet's full size. Critical props: `keyboardShouldPersistTaps="always"` and `keyboardDismissMode="none"` (the keyboard is up; without them the first tap dismisses instead of selecting). No background on the root, so the panel's material shows between cells. It exposes:

```tsx
measureCell: (id) => {
  const layout = list.getLayout(index)
  if (!layout) return null
  const scrolled = list.getAbsoluteLastScrollOffset() - list.getFirstItemOffset()
  return { x: layout.x, y: layout.y - scrolled, w: layout.width - GRID.gap, h: layout.height - GRID.gap }
}
```

`PhotoCell`: the image inset by `GRID.gap` on right/bottom with a 2pt radius (the hairline of sheet showing through is what separates photos), and a numbered blue badge that springs in. The photo itself never shrinks or dims on selection. A `lifted` cell renders at `opacity: 0`: cut, not faded, because its copy is flying out of that exact rect.

Photos come from `expo-media-library`, newest first, via the query API; the asset id is already a loadable uri for `expo-image`.

## Composer

The composer's bottom edge is pinned; attachments grow it upward, which keeps the + button (the panel's anchor) still. The strip is a clipped window of animated height `strip.get() * COMPOSER_STRIP_HEIGHT`; the thumbnails inside are absolutely pinned at full size to its top, so a half-open strip shows the top of the photos rather than a squashed copy.

- The + glyph slides right by `plusOut.get() * COMPOSER.plusSlide` and fades over `[0, 0.75]` of `plusOut`, clamped. Only the glyph moves; the hit target stays so the dismiss tap lands on the same spot.
- Thumbnails whose id is in `pendingIds` (photos still flying) render hidden, so a photo is never on screen twice.
- New thumbnails have no entering animation (the flying copy is the entrance); removals use `FadeOut` plus `LinearTransition` so neighbors close the gap.
- A `retained` copy of the attachments outlives the state so the strip has content while it closes; it empties only when an animated reaction sees `strip.get() === 0`.
- The bar is non-interactive `Glass` (containers don't bulge); the send button is solid white.

## Flights

`useAttachmentFlights` owns `attach` (flight progress) and `strip` (slot position), plus the attachments array. `attachAndLeave(leaving)` sets the flights, appends the attachments (which opens the strip via an effect), calls the panel's `collapseForLeave`, and springs `attach` to 1. The completion schedules `settle()`, which clears flights, resets `attach`, and resets the panel in one synchronous block so React batches it into one commit. Anything async in the middle double-exposes a photo.

`FlyingPhoto` interpolates its rect every frame, reading the still-moving strip live:

```tsx
const composerTop = composerBottom.get() - COMPOSER.rowHeight - strip.get() * COMPOSER_STRIP_HEIGHT
const toX = Math.min(GUTTER + COMPOSER.stripPaddingTop + flight.slot * step, lastVisible)
return {
  left: mix(a, flight.from.x, toX),
  top: mix(a, flight.from.y, composerTop + COMPOSER.stripPaddingTop),
  width: mix(a, flight.from.w, COMPOSER.thumbSize),
  height: mix(a, flight.from.h, COMPOSER.thumbSize),
  borderRadius: mix(a, flight.fromRadius ?? GRID.cellRadius, COMPOSER.thumbRadius),
}
```

The image uses `transition={0}`. It is the same decoded image the grid drew, handed over on the frame the cell hides.

Building the flights on confirm: read the sheet top from `composerBottom.get()` (the panel is at rest and fully morphed, so no measure pass), convert each `measureCell` result to window coordinates, and fall back to the middle of the sheet for a photo scrolled out of layout. Filter out photos already attached: the id is the strip's React key, and a duplicate key breaks the layout animations. A camera capture rides the same path with `from` set to the whole sheet's rect and `fromRadius: GRID.panelRadius`, while the preview is cut underneath it on the same frame.

While flights exist (`isFlying`), the whole overlay takes `pointerEvents="none"` so a backdrop tap cannot start a second close.

## Floating bars

The ‹ back button, the confirm pill, the shutter, and the camera options all float outside the panel, at the bottom of the window. They are glass, and the panel's content layers have animated opacity, which would render glass as nothing. They sit inside the sheet's edges (`left: GUTTER`, `bottom: GUTTER + 25`), stay mounted while the menu is up with their material off and glyphs faded, and take an `active` flag so they don't steal the menu's taps.

The confirm pill ("All Photos" ⇄ "Add N photos") is one glass capsule, never faded; a blue tint view and two labels crossfade inside it. Its width springs to a hidden sizer label's measured width, pinned to the trailing edge. Two details:

- Drive the crossfade through `useDerivedValue(() => withTiming(...))`, then multiply in the style. Multiplying a `withTiming` result directly inside `useAnimatedStyle` does arithmetic on an animation descriptor and produces NaN.
- `fontVariant: ['tabular-nums']` on the label and the sizer, so the capsule only resizes when the count gains a digit.

The camera bar's ⋯ unfolds two options (flip, flash) straight up out of itself on `SPRING.panel` / `SPRING.panelOut`, starting at scale 0.35. Glass at zero size has nothing to refract, so the first frames would be a hole. Option icon opacity is clamped; the scale is allowed to overshoot. The ⋯ crossfades to an ✕ with a quarter turn.

`CameraSheet` wears the grid's exact footprint, black background (a preview starts a frame or two after mount), `animateShutter={false}` (the flight is the shutter feedback), and `mirror` for the front camera.

## Do not change these behaviors

- The panel mounts only after the 30ms `plusLead`; a tap during the lead cancels it.
- Every close uses `SPRING.panelOut` (dampingRatio 1). Overshoot below zero would take the rect past the + button.
- Glass is never under an animated opacity, and nothing above glass clips.
- Originals are cut (`opacity: 0`), never faded, on the frame their flying copy appears.
- `settle()` stays synchronous: one React commit for the hand-off.
- The flight reads `strip.get()` live; do not precompute its landing point.
- `keyboardShouldPersistTaps="always"` on the grid and the strip.
- `KeyboardController.setFocusTo('current')` on every close that unmounts the over-keyboard window.
- All copies in one confirm ride the same `attach` spring; no stagger.
- Use `.get()` / `.set()` on shared values and `scheduleOnRN` from `react-native-worklets`.
