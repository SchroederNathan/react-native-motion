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
  panelRadius: 45,
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
   */
  paddingHorizontal: 25,
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
 * Every move on this screen, written the way iOS writes them.
 *
 * Reanimated's perceptual-duration form takes the same pair of numbers as
 * SwiftUI's `Spring(duration:bounce:)`, with `dampingRatio` standing in for
 * `1 - bounce`. So the system springs transcribe directly:
 *
 *   .smooth  → { duration: 500, dampingRatio: 1    }
 *   .snappy  → { duration: 500, dampingRatio: 0.85 }
 *   .bouncy  → { duration: 500, dampingRatio: 0.7  }
 *
 * Reanimated's own default is `{ duration: 550, dampingRatio: 1 }` — `.smooth`,
 * slightly long. That is a general-purpose spring, and a menu is not general
 * purpose: UIKit opens a context menu in about a third of a second. These are
 * that, and bounce is spent only where something should look thrown rather
 * than placed.
 *
 * The durations are perceptual. Reanimated keeps a spring alive for 1.5× the
 * number below before it reports finished, but that tail is sub-pixel — read
 * these against the timings they replaced, not against a stopwatch.
 */
export const SPRING = {
  /** + tapped → menu at rest. The menu is thrown out of the circle. */
  menuIn: { duration: 320, dampingRatio: 0.75 },
  /** Menu → dismissed. Nothing bounces on the way out. */
  menuOut: { duration: 240, dampingRatio: 1 },
  /** Menu → full-bleed photo grid. */
  toGrid: { duration: 380, dampingRatio: 0.9 },
  /** Photo grid → menu (the ‹ button). */
  toMenu: { duration: 300, dampingRatio: 1 },
  /** Grid → the thumbnail's slot in the composer. */
  attach: { duration: 340, dampingRatio: 0.88 },
  /**
   * The composer growing around the attachment strip and collapsing back.
   * Deliberately shorter than `attach`: the slot the photo is flying into is
   * still opening underneath it, and it has to stop moving first.
   */
  strip: { duration: 300, dampingRatio: 1 },
  /** Selection badge pop — the one thing here allowed to look springy. */
  badge: { duration: 280, dampingRatio: 0.6 },
  /**
   * The confirm capsule resizing as its label grows. SwiftUI's `.snappy` with
   * half its duration: the capsule is chasing a tap, so it has to be back at
   * rest before the next one lands.
   */
  pill: { duration: 250, dampingRatio: 0.85 },
} as const;

/**
 * Lengths for the things that cannot take a spring: opacity crossfades, and
 * the material's native transition, which wants a number of seconds.
 */
export const DURATION = {
  /** Nominal length of each move — kept in step with `SPRING` above. */
  menuIn: 320,
  menuOut: 240,
  toGrid: 380,
  toMenu: 300,
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
} as const;
