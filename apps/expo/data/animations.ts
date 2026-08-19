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
  /**
   * Bundled preview. Omit while a demo is built but not yet recorded — the card
   * then shows a placeholder instead of a player. `require()` of a missing file
   * fails the bundle, so leave this off until the .mp4 is actually in place.
   */
  video?: VideoSource;
}

export const animations: Animation[] = [
  {
    title: 'Aurora Curtain',
    slug: 'aurora-curtain',
    description:
      'A Skia curtain of violet light over the top of the screen, every constant measured off a real one: irregular rays that lean into their own drift, a calibrated grain, and more of it hidden above the edge than on show. Drag down to draw the rest in.',
    tags: ['aurora', 'skia', 'shader', 'gesture', 'procedural', 'seamless-loop'],
    video: require('../assets/videos/aurora.mp4'),
  },
  {
    title: 'Blurred Text Morph',
    slug: 'blurred-text-morph',
    description:
      'Character-diffing text swap drawn through Skia. Shared letters glide to their new position while the rest blur out and blur in, one after another.',
    tags: ['text', 'morph', 'skia', 'blur', 'stagger', 'spring', 'typography'],
    video: require('../assets/videos/blurred-text-morph.mp4'),
  },
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
    title: 'Stack Toast',
    slug: 'spring-toast',
    description:
      'Stacking bottom toasts: each new one springs up and pushes the rest back a step, smaller behind smaller. The front toast follows the finger — rubber-banding upward, committing on a downward flick — and dismissing it springs the stack forward.',
    tags: ['toast', 'stack', 'spring', 'gesture', 'swipe-to-dismiss', 'haptics', 'notification'],
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
