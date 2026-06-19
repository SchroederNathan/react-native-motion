import Ionicons from '@expo/vector-icons/Ionicons';

/** Icon shape consumed by the radial buttons: just a size + color. */
export interface RadialIconProps {
  size: number;
  color: string;
}

export function StarIcon({ size, color }: RadialIconProps) {
  return <Ionicons name="star" size={size} color={color} />;
}

export function BookmarkIcon({ size, color }: RadialIconProps) {
  return <Ionicons name="bookmark" size={size} color={color} />;
}

export function ShareIcon({ size, color }: RadialIconProps) {
  return <Ionicons name="arrow-redo" size={size} color={color} />;
}

export function TrashIcon({ size, color }: RadialIconProps) {
  return <Ionicons name="trash" size={size} color={color} />;
}
