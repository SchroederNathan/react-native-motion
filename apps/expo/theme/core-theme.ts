import { taupe } from './palette';
import type { Theme } from './types';

/**
 * Font family names registered by `useFonts` in the root layout (the keys map
 * 1:1 to the `@expo-google-fonts/manrope` exports). Shared by every theme that
 * doesn't override them.
 */
export const manropeFonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
} as const;

/**
 * The React Native Motion app shell theme — the default for the home/list and
 * anything that doesn't apply its own theme. Mirrors the website's unified
 * taupe palette across light and dark.
 */
export const coreTheme: Theme = {
  name: 'core',
  colors: {
    light: {
      background: taupe[100],
      card: taupe[50],
      text: taupe[950],
      textSecondary: taupe[500],
      border: taupe[200],
      tint: taupe[900],
    },
    dark: {
      background: taupe[950],
      card: taupe[900],
      text: taupe[50],
      textSecondary: taupe[400],
      border: taupe[800],
      tint: taupe[50],
    },
  },
  fonts: manropeFonts,
};
