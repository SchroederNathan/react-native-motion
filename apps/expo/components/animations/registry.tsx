import type { ComponentType } from 'react';
import { AuroraCurtainScreen } from './aurora-curtain';
import { BlurredTextMorphScreen } from './blurred-text-morph';
import { GalleryCarouselScreen } from './gallery-carousel';
import { RadialMenuScreen } from './radial-menu';

/**
 * Maps an animation slug to its self-contained demo screen. To add a new
 * animation: create a folder under `components/animations/<slug>/` exporting a
 * screen component, then register it here. No route changes required.
 */
export const animationScreens: Record<string, ComponentType> = {
  'aurora-curtain': AuroraCurtainScreen,
  'blurred-text-morph': BlurredTextMorphScreen,
  'gallery-carousel': GalleryCarouselScreen,
  'radial-menu': RadialMenuScreen,
};
