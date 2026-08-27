import { defineTheme } from '@/theme';
import { COLORS } from './constants';

/**
 * The reference UI is a fixed dark surface — it doesn't follow the system
 * appearance — so both variants carry the same values.
 */
const palette = {
  background: COLORS.background,
  card: COLORS.surface,
  text: COLORS.text,
  textSecondary: COLORS.placeholder,
  border: 'rgba(255,255,255,0.08)',
  tint: COLORS.accent,
};

export const chatgptAttachmentsTheme = defineTheme({
  name: 'chatgpt-attachments',
  colors: { light: palette, dark: palette },
});
