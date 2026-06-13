import { coreTheme } from './core-theme';
import type { DeepPartial, Theme } from './types';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepMerge<T>(base: T, override: DeepPartial<T>): T {
  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const key of Object.keys(override) as (keyof T)[]) {
    const overrideValue = override[key];
    if (overrideValue === undefined) continue;
    const baseValue = (base as Record<string, unknown>)[key as string];
    result[key as string] =
      isObject(baseValue) && isObject(overrideValue)
        ? deepMerge(baseValue, overrideValue as DeepPartial<typeof baseValue>)
        : overrideValue;
  }
  return result as T;
}

/**
 * Build a theme by overriding only what differs from the core theme. Intended
 * for per-animation themes co-located with each animation, e.g.:
 *
 *   // app/animations/<slug>/theme.ts
 *   export const theme = defineTheme({
 *     name: 'gallery-carousel',
 *     colors: { dark: { tint: '#f0abfc' } },
 *   });
 *
 * Then wrap that animation's screen in `<ThemeProvider theme={theme}>` so only
 * that screen restyles; everything else stays on the core theme.
 */
export function defineTheme(overrides: DeepPartial<Theme>): Theme {
  return deepMerge(coreTheme, overrides);
}
