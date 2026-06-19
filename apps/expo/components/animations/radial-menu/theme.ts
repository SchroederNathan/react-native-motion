import { defineTheme } from '@/theme';

// Co-located theme override: only the tint differs from the core theme.
export const radialMenuTheme = defineTheme({
  name: 'radial-menu',
  colors: {
    light: { tint: '#FF6B6B' },
    dark: { tint: '#FF6B6B' },
  },
});
