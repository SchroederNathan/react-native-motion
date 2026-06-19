import {
  BookmarkIcon,
  ShareIcon,
  StarIcon,
  TrashIcon,
} from './icons';
import type { RadialActionDef } from './radial-menu';

/** Colored cards standing in for artwork, mirroring the gallery demo. */
export interface MediaCardItem {
  id: string;
  color: string;
  label: string;
}

export const CARDS: MediaCardItem[] = [
  { id: '1', color: '#FF6B6B', label: 'Coral' },
  { id: '2', color: '#4D96FF', label: 'Azure' },
  { id: '3', color: '#43AA8B', label: 'Pine' },
  { id: '4', color: '#9B5DE5', label: 'Violet' },
  { id: '5', color: '#F7B267', label: 'Amber' },
  { id: '6', color: '#F15BB5', label: 'Rose' },
  { id: '7', color: '#00BBF9', label: 'Sky' },
  { id: '8', color: '#06D6A0', label: 'Mint' },
  { id: '9', color: '#FF8C42', label: 'Ember' },
  { id: '10', color: '#7B6CF6', label: 'Indigo' },
  { id: '11', color: '#EF476F', label: 'Cherry' },
  { id: '12', color: '#118AB2', label: 'Teal' },
];

/** Actions fanned out by the radial menu. */
export const ACTIONS: RadialActionDef[] = [
  { id: 'favorite', icon: StarIcon, title: 'Favorite' },
  { id: 'save', icon: BookmarkIcon, title: 'Save' },
  { id: 'share', icon: ShareIcon, title: 'Share' },
  { id: 'delete', icon: TrashIcon, title: 'Delete' },
];

export const ACTION_TITLES: Record<string, string> = Object.fromEntries(
  ACTIONS.map((a) => [a.id, a.title]),
);
