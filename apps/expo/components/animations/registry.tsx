import type { ComponentType } from 'react';
import { BlurredTextMorphScreen } from './blurred-text-morph';
import { GalleryCarouselScreen } from './gallery-carousel';

/**
 * Maps an animation slug to its self-contained demo screen. To add a new
 * animation: create a folder under `components/animations/<slug>/` exporting a
 * screen component, then register it here. No route changes required.
 */
export const animationScreens: Record<string, ComponentType> = {
  'blurred-text-morph': BlurredTextMorphScreen,
  'gallery-carousel': GalleryCarouselScreen,
};
