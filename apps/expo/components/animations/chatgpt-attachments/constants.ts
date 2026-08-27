import { Easing } from 'react-native-reanimated';

/**
 * Every number below was measured frame by frame off the reference screen
 * recording (1290×2796 @3x, so a 430×932pt window) and divided down to points.
 * Nothing here is eyeballed — when a value looks oddly specific, that's why.
 */

/** Side gutter shared by the composer, the menu and the photo grid. */
export const GUTTER = 12;

export const COLORS = {
  background: '#000000',
  /** Composer + keyboard surface, sampled at rgb(29,29,29). */
  surface: '#1D1D1D',
  placeholder: '#777777',
  text: '#FFFFFF',
  /** iOS system blue, sampled at rgb(2,121,254) on the un-tinted pixels. */
  accent: '#007AFF',
  /** The "Add N photos" pill, sampled as a whole: rgb(5,109,231). */
  accentGlass: '#056DE7',
  /**
   * The glass controls darken what they sit on: the ‹ button reads at 0.71× its
   * backdrop in the reference and the pill at 0.65×.
   */
  controlScrim: 'rgba(0,0,0,0.31)',
  /** Fill of the round icon wells inside the menu. */
  iconWell: 'rgba(255,255,255,0.09)',
  /**
   * Laid over the panel's blur to land on the reference's material. The target
   * is the one unambiguous sample: over a black background the menu measures
   * rgb(30,30,30). The blur alone lands at 19, so this closes the remaining 11.
   */
  material: 'rgba(255,255,255,0.047)',
  /**
   * The same material where there is no blur to lay it over — the number the
   * two above are aiming at, straight. Android's blur can only sample its own
   * window, and the sheet is hosted over the keyboard in another one, so a blur
   * there returns nothing and the tint alone is 4.7% white over whatever shows
   * through. This is that measurement as an opaque fill.
   */
  materialFlat: '#1E1E1E',
} as const;

export const COMPOSER = {
  radius: 24,
  /** Row holding +, the field, the mic and the action button. */
  rowHeight: 48,
  /** Left padding of that row. */
  rowPaddingLeft: 14,
  /** Hit target the + glyph sits in the middle of. */
  plusHit: 30,
  /**
   * Diameter of the circular well the menu grows out of. Fitted around the
   * 20pt + glyph — nothing paints this circle while the sheet is shut; it is
   * the panel's own shape at the very start of the open.
   */
  plusWell: 34,
  /** Gap between the composer's bottom edge and the top of the keyboard. */
  keyboardGap: 12,
  /** Padding above the attachment strip, once there is one. */
  stripPaddingTop: 8,
  /** Gap between the attachment strip and the text row. */
  stripGap: 7,
  thumbSize: 115,
  // Circle fitted to the corner in the reference; these surfaces are far
  // rounder than they look at a glance.
  thumbRadius: 18,
  thumbGap: 7,
  /** Diameter of the ✕ badge sitting inside each thumbnail. */
  removeBadge: 17,
  removeBadgeInset: 6,
  /** White circular voice / send button. */
  actionSize: 30,
  plusSize: 20,
  /**
   * How far right the + glyph slides to clear the space the menu grows out of.
   * Not a measurement — the reference leaves the + where it is — but the panel
   * opens on that exact spot, and something has to give it up. About the
   * glyph's own width reads as moving aside rather than drifting.
   */
  plusSlide: 16,
  micSize: 20,
  fieldSize: 17,
} as const;

/**
 * Window X of the + button's centre — where the panel's circle is anchored.
 * The composer is inset by the gutter, and the + sits in the middle of its hit
 * target at the start of the row.
 */
export const PLUS_CENTER_X = GUTTER + COMPOSER.rowPaddingLeft + COMPOSER.plusHit / 2;

/** Composer height with no attachments — just the text row. */
export const COMPOSER_COLLAPSED_HEIGHT = COMPOSER.rowHeight;

/** Height the attachment strip adds to the composer: 8 + 115 + 7. */
export const COMPOSER_STRIP_HEIGHT =
  COMPOSER.stripPaddingTop + COMPOSER.thumbSize + COMPOSER.stripGap;

export const MENU = {
  width: 280,
  itemHeight: 66,
  paddingVertical: 12,
  /** Fitted from the reference's corner profile — a near-squircle. */
  radius: 46,
  iconWell: 42,
  iconSize: 22,
  /** Icon well inset from the panel's left edge. */
  iconInset: 24,
  labelGap: 18,
  labelSize: 19,
  /**
   * The menu's centre sits this far below the + button's centre in the
   * recording. Small, but it's what the frames show.
   */
  centerOffset: 7,
} as const;

export const MENU_ITEMS = 5;
export const MENU_HEIGHT = MENU.itemHeight * MENU_ITEMS + MENU.paddingVertical * 2;

export const GRID = {
  columns: 3,
  /** Hairline of the sheet showing between the cells. */
  gap: 1.5,
  /**
   * Each cell's own corner radius. Small enough that it reads as a softened
   * edge rather than a rounded tile, but it is what stops the grid looking
   * like one photo cut into nine pieces.
   */
  cellRadius: 2,
  /**
   * Corner radius of the sheet once it has become the grid, measured off the
   * reference. The cells are square, separated by `gap` and rounded by
   * `cellRadius`; the sheet's own corners clip the four that reach them.
   */
  panelRadius: 52,
  /**
   * The selection badge: a blue disc inside a white ring, sitting in the cell's
   * bottom-right corner. Measured off the reference, where a selected cell is
   * marked by the badge alone — the thumbnail itself does not shrink, dim or
   * round off.
   */
  badgeSize: 23,
  badgeRing: 2,
  badgeInset: 4,
  badgeLabelSize: 14,
  /** How many library assets to pull in. */
  pageSize: 180,
} as const;

export const BOTTOM_BAR = {
  /**
   * Inset from the sheet's own edge, not the screen's — measured off the
   * reference, where the ‹ button and the pill both sit 25pt inside the sheet
   * (so 37pt from the screen edge, once the gutter is counted).
   *
   * The same on all three sides. The controls float in the sheet's bottom
   * corners, and a corner only reads as a corner when both of its gaps match —
   * so the bottom is measured from the sheet's edge too, not from the home
   * indicator, which would push it out by however much the device inset is.
   */
  inset: 25,
  backSize: 46,
  backIcon: 22,
  pillHeight: 43,
  pillPaddingHorizontal: 22,
  pillLabelSize: 17,
} as const;

/**
 * Opacity is the only thing here still driven by a curve. A quart-out spends
 * the back half of its timeline covering six percent of the distance — that
 * creep is what made these transitions read as slow. It is harmless on a fade
 * and wrong on anything that moves, so everything that moves is a spring.
 */
export const EASE_FADE = Easing.out(Easing.quad);

/** Kept for the blur pulse, which wants a quart's hard front edge. */
export const EASE_OUT = Easing.out(Easing.poly(4));

/**
 * The panel itself — opening out of the + button, morphing into the grid,
 * collapsing back — uses Reanimated's default spring: `withSpring(target)`
 * with no config at all. Under the hood that is `{ duration: 550,
 * dampingRatio: 1 }`, critically damped, which SwiftUI would call `.smooth`.
 * There is deliberately no entry for it below; the point is that there is
 * nothing to tune.
 *
 * What is left here is the handful of moves that are not the panel. They are
 * written in Reanimated's perceptual-duration form, which takes the same pair
 * of numbers as SwiftUI's `Spring(duration:bounce:)` with `dampingRatio`
 * standing in for `1 - bounce`:
 *
 *   .smooth  → { duration: 500, dampingRatio: 1    }
 *   .snappy  → { duration: 500, dampingRatio: 0.85 }
 *   .bouncy  → { duration: 500, dampingRatio: 0.7  }
 *
 * The durations are perceptual. Reanimated keeps a spring alive for 1.5× the
 * number below before it reports finished, but that tail is sub-pixel — read
 * these against a timing curve, not against a stopwatch.
 */
export const SPRING = {
  /**
   * The panel: opening out of the + button, morphing into the grid, collapsing
   * back. This is Reanimated's default spring with one number changed.
   *
   * `dampingRatio: 1` IS the default — critically damped, no overshoot — so
   * the shape of the move is untouched. The default's own `duration` is 550ms
   * perceptual, which is about 825ms of real settle, and there is no way to
   * shorten that without saying so explicitly: the exported presets
   * (`GentleSpringConfig`, `SnappySpringConfig`, `WigglySpringConfig`) all
   * share `mass: 4, stiffness: 900`, so they change the bounce and not the
   * speed.
   *
   * ⟵ THIS IS THE NUMBER TO TUNE. Lower is faster. 550 is the stock default,
   * ~300 is about the pace UIKit opens a context menu at.
   *
   * `dampingRatio` is the bounce. 1 is the default and does not overshoot at
   * all; below it, the panel goes a little past its resting size and settles
   * back. How far past, as a fraction of the whole move:
   *
   *   0.9  → 0.2%   0.8  → 1.5%   0.7  → 4.6%
   *   0.85 → 0.6%   0.75 → 2.8%   0.5  → 16%   (Reanimated 3's old default)
   *
   * 0.75 is `WigglySpringConfig`, which is as bouncy as Reanimated's own
   * presets go. 0.8 sits just inside that: on the 280pt menu it is about four
   * points of overshoot — enough to read as thrown rather than placed, not
   * enough to look like a toy.
   */
  panel: { duration: 400, dampingRatio: 0.8 },
  /**
   * The same spring with the bounce taken out, for the way back to the +
   * button. Things arriving are allowed to overshoot; things leaving are not —
   * and `open` overshooting below zero would take the panel's rect past the
   * button it is collapsing into.
   */
  panelOut: { duration: 400, dampingRatio: 1 },
  /**
   * Grid → the thumbnail's slot in the composer. Not the default spring: this
   * one has to beat nothing in particular, but it does have to arrive after
   * `strip` has finished opening the slot it is aiming at.
   */
  attach: { duration: 400 },
  /**
   * The composer growing around the attachment strip and collapsing back.
   * Deliberately shorter than `attach`, for the reason above.
   */
  strip: { duration: 400 },
  /** Selection badge pop — the one thing here allowed to look springy. */
  badge: { duration: 400 },
  /**
   * The confirm capsule resizing as its label grows. SwiftUI's `.snappy` with
   * half its duration: the capsule is chasing a tap, so it has to be back at
   * rest before the next one lands.
   */
  pill: { duration: 400 },
} as const;

/**
 * Lengths for the things that cannot take a spring: opacity crossfades, and
 * the material's native transition, which wants a number of seconds.
 */
export const DURATION = {
  /**
   * The panel's material has to be told how long to take in milliseconds, so
   * this tracks `SPRING.panel.duration` — change that one and this follows.
   */
  panel: SPRING.panel.duration,
  attach: 340,
  /**
   * Content crossfade inside the morphing panel. Far shorter than the move:
   * the panel is scaling both layers at the same time, so the fade only has to
   * cover the stretch where both are legible at once.
   */
  crossfade: 150,
  /** Blur ramp layered over the crossfade. */
  blur: 160,
  /** "All Photos" ⇄ "Add N photos". */
  pill: 160,
  /**
   * How long the + glyph gets to itself before the panel arrives.
   *
   * The panel opens as the circle around that glyph and is 14pt wider than it,
   * so there is no starting size at which the two do not overlap — the panel
   * has to be absent for this stretch, not small. Long enough to read the +
   * move, short enough that the tap still answers at once: it answers with the
   * + rather than with the menu.
   */
  plusLead: 30,
} as const;

/** A rect. Window coordinates unless the field it sits on says otherwise. */
export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Linear interpolation, on the UI thread. Lives here rather than in one of the
 * views because the panel and the photos flying out of it have to agree on how
 * a rect is walked from one frame to another — they are moving apart from the
 * same edges.
 */
export function mix(t: number, a: number, b: number) {
  'worklet';
  return a + (b - a) * t;
}
