import { createContext, use, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { coreTheme } from './core-theme';
import { tokens, type Tokens } from './tokens';
import type { ColorScheme, ColorTokens, Theme } from './types';

const ThemeContext = createContext<Theme>(coreTheme);

interface ThemeProviderProps {
  /** Theme for this subtree. Defaults to the core app theme. */
  theme?: Theme;
  children: ReactNode;
}

/**
 * Provides a theme to its subtree. Nest a provider on an animation screen to
 * restyle only that screen:
 *
 *   <ThemeProvider theme={galleryCarouselTheme}>...</ThemeProvider>
 */
export function ThemeProvider({ theme = coreTheme, children }: ThemeProviderProps) {
  return <ThemeContext value={theme}>{children}</ThemeContext>;
}

export interface UseThemeResult {
  /** The full active theme. */
  theme: Theme;
  /** Resolved system appearance. */
  scheme: ColorScheme;
  /** Active palette for the current appearance. */
  colors: ColorTokens;
  /** Theme-independent tokens (spacing, radius, type scale, shadows). */
  tokens: Tokens;
}

/**
 * Reads the active theme and resolves the current system appearance
 * (light/dark) into a concrete palette. Single source of truth for styling.
 */
export function useTheme(): UseThemeResult {
  const theme = use(ThemeContext);
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return {
    theme,
    scheme,
    colors: theme.colors[scheme],
    tokens,
  };
}
