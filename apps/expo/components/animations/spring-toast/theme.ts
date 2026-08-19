import { defineTheme } from '@/theme';

// Co-located theme override: only the tint differs from the core theme.
export const stackToastTheme = defineTheme({
  name: 'stack-toast',
  colors: {
    light: { tint: '#3E9B63' },
    dark: { tint: '#5BC488' },
  },
});
