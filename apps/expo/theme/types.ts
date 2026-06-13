/**
 * Theme contracts for the design system.
 *
 * A `Theme` is a swappable unit (colors + fonts, with light/dark variants).
 * The app shell uses the core theme; each animation may supply its own theme
 * via `defineTheme()` and apply it to its screen with `<ThemeProvider>`.
 *
 * Theme-independent values (spacing, radius, type scale, shadows) live in
 * `tokens.ts` and are shared across every theme.
 */

/** Semantic colors for a single appearance (light or dark). */
export interface ColorTokens {
  /** Screen background. */
  background: string;
  /** Surface raised above the background (cards, sheets). */
  card: string;
  /** Primary text. */
  text: string;
  /** De-emphasized text (descriptions, captions). */
  textSecondary: string;
  /** Hairline borders and dividers. */
  border: string;
  /** Accent / interactive color. */
  tint: string;
}

/** Font family names used across weights. */
export interface FontTokens {
  regular: string;
  medium: string;
  semibold: string;
  bold: string;
}

export interface Theme {
  /** Human-readable identifier, e.g. "core" or "gallery-carousel". */
  name: string;
  colors: {
    light: ColorTokens;
    dark: ColorTokens;
  };
  fonts: FontTokens;
}

export type ColorScheme = 'light' | 'dark';

/** Recursive partial used by `defineTheme` to override only what differs. */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
