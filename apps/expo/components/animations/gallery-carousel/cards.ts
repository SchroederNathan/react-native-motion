import type { CarouselItem } from './gallery-stack-carousel';

/** Basic colored cards standing in for artwork. */
export const CARDS: CarouselItem[] = [
  { id: '1', color: '#FF6B6B', label: '1' },
  { id: '2', color: '#F7B267', label: '2' },
  { id: '3', color: '#43AA8B', label: '3' },
  { id: '4', color: '#4D96FF', label: '4' },
  { id: '5', color: '#9B5DE5', label: '5' },
  { id: '6', color: '#F15BB5', label: '6' },
  { id: '7', color: '#00BBF9', label: '7' },
];

export const CARD_COLORS = CARDS.map((c) => c.color);
