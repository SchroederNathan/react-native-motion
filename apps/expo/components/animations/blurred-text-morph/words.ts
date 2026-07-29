/**
 * The cycle of headlines — four unrelated phrases, so each swap replaces most of
 * the string rather than rearranging the same words.
 *
 * Because the phrases are genuinely different, most glyphs blur out and blur in,
 * while the letters they happen to share (`e`, `t`, `s`, `i`, and the space)
 * survive and glide to their new position. That mix is the point: you see both
 * halves of the effect at once, and the surviving letters give the eye something
 * continuous to follow across an otherwise complete change.
 *
 * Keep these lowercase and ASCII. Character identity is case-sensitive, so `B`
 * and `b` would not match, and glyph advances are indexed per character, so a
 * multi-codepoint grapheme would misalign the layout. Spaces are fine — they
 * carry a real advance and simply draw nothing.
 *
 * The canvas fits its type to the widest phrase here, so adding a longer one
 * shrinks every phrase rather than clipping.
 */
export const WORDS = [
  'buttery smooth',
  'gesture driven',
  'sixty frames',
  'feels native',
] as const;
