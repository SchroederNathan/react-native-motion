/**
 * Raw "taupe" color scale, mirrored from the website's design tokens in
 * `apps/website/app/globals.css` (defined there in OKLCH and converted to hex
 * here, since React Native's color parser does not understand `oklch()`).
 *
 * This is a reusable building block — themes (core or per-animation) reference
 * these values rather than redeclaring hex codes.
 */
export const taupe = {
  50: '#fcfbfa',
  100: '#f4f2f1',
  200: '#e9e5e3',
  300: '#d7d1cd',
  400: '#a9a09a',
  500: '#7a716a',
  600: '#5e5751',
  700: '#4c4641',
  800: '#352f2c',
  900: '#28231f',
  950: '#191613',
} as const;

export type TaupeScale = typeof taupe;
