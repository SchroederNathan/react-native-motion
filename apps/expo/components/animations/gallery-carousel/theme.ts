import { defineTheme } from '@/theme';

// Co-located theme override: only the tint differs from the core theme.
export const galleryCarouselTheme = defineTheme({
  name: 'gallery-carousel',
  colors: {
    light: { tint: '#9B5DE5' },
    dark: { tint: '#9B5DE5' },
  },
});
