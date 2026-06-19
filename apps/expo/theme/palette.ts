/**
 * Raw "taupe" color scale, mirrored from the website's design tokens in
 * `apps/website/app/globals.css` (defined there in OKLCH and converted to hex
 * here, since React Native's color parser does not understand `oklch()`).
 *
 * This is a reusable building block — themes (core or per-animation) reference
 * these values rather than redeclaring hex codes.
 */
export const taupe = {
  50: '#fbfaf9',
  100: '#f5f3f0',
  200: '#e7e2dc',
  300: '#d3cbc0',
  400: '#aa9e8d',
  500: '#867865',
  600: '#6c6050',
  700: '#554b3e',
  800: '#40382d',
  900: '#2c271f',
  950: '#17130e',
} as const;

export type TaupeScale = typeof taupe;
