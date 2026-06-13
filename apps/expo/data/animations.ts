import type { VideoSource } from 'expo-video';

/**
 * Mirrors the website's animation registry — each entry corresponds to a
 * `content/animations/<slug>/page.mdx` `meta` block in `apps/website`, with the
 * preview video bundled locally (copied to `assets/videos/`).
 *
 * Hand-maintained for now. Keep in sync when animations are added on the site.
 */
export interface Animation {
  title: string;
  slug: string;
  description: string;
  tags: string[];
  video: VideoSource;
}

export const animations: Animation[] = [
  {
    title: 'Gallery Stack Carousel',
    slug: 'gallery-carousel',
    description:
      'A stacked card carousel with blurred backdrop crossfade. Cards blend from a fanned stack into a centered carousel on swipe.',
    tags: ['carousel', 'gallery', 'stack', 'backdrop', 'blur', 'spring'],
    video: require('../assets/videos/gallery-carousel.mp4'),
  },
  {
    title: 'Radial Menu',
    slug: 'radial-menu',
    description:
      'Long-press radial menu with blur overlay, cloned card, proximity-scaled actions, edge-aware fan angles, and haptics.',
    tags: ['radial', 'menu', 'long-press', 'gesture', 'haptics', 'spring', 'overlay'],
    video: require('../assets/videos/radial-menu.mp4'),
  },
  {
    title: 'Linear Tab Bar',
    slug: 'linear-tab-bar',
    description:
      'A glassmorphic tab bar with pill-to-menu morph, liquid glass stretch, touch-tracking glow, and search mode transitions.',
    tags: ['tab-bar', 'glass', 'morph', 'gesture', 'haptics', 'spring', 'menu', 'search'],
    video: require('../assets/videos/linear-tab-bar.mp4'),
  },
];
