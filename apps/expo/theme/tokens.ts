/**
 * Theme-independent design tokens shared by every theme. Swapping themes
 * changes colors and fonts (see `types.ts`), never these structural values.
 */
import type { ViewStyle } from 'react-native';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  card: 16,
} as const;

export const fontSize = {
  caption: 13,
  body: 15,
  title: 17,
  largeTitle: 28,
} as const;

/**
 * Subtle inset hairline that traces the edge of media, mirroring the website's
 * `.image-outline` utility. Sits on top of an image/video to avoid a hard edge.
 */
export const imageOutline: ViewStyle = {
  boxShadow: 'inset 0 0 0 1px rgba(25, 22, 19, 0.1)',
};

/**
 * Card elevation, mirroring the website's `.border-shadow`: a 1px ring plus a
 * soft drop shadow.
 */
export const cardShadow: ViewStyle = {
  boxShadow:
    '0px 0px 0px 1px rgba(25, 22, 19, 0.06), 0px 1px 2px -1px rgba(25, 22, 19, 0.06), 0px 2px 4px 0px rgba(25, 22, 19, 0.04)',
};

export const tokens = {
  spacing,
  radius,
  fontSize,
  imageOutline,
  cardShadow,
} as const;

export type Tokens = typeof tokens;
