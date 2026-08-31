import { Icon } from '@/components/icon';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, MENU, MENU_HEIGHT, PANEL_CONTENT } from '../constants';

export type MenuAction = 'camera' | 'photos' | 'files' | 'plugins' | 'think';

interface MenuItem {
  action: MenuAction;
  label: string;
  icon: 'camera' | 'photos' | 'paperclip' | 'plugins' | 'gauge';
}

const ITEMS: MenuItem[] = [
  { action: 'camera', label: 'Camera', icon: 'camera' },
  { action: 'photos', label: 'Photos', icon: 'photos' },
  { action: 'files', label: 'Files', icon: 'paperclip' },
  { action: 'plugins', label: 'Plugins', icon: 'plugins' },
  { action: 'think', label: 'Think harder', icon: 'gauge' },
];

interface AttachmentMenuProps {
  onSelect: (action: MenuAction) => void;
}

/**
 * The five rows that live inside the panel while it is still menu-shaped. It
 * has no background of its own — the panel owns the glass — and no size logic,
 * because the panel scales it.
 */
export function AttachmentMenu({ onSelect }: AttachmentMenuProps) {
  return (
    <View style={styles.root}>
      {ITEMS.map((item) => (
        <Pressable
          key={item.action}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          onPress={() => onSelect(item.action)}
          style={styles.row}
        >
          <View style={styles.well}>
            <Icon name={item.icon} size={MENU.iconSize} color={COLORS.text} />
          </View>
          <Text style={styles.label}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...PANEL_CONTENT,
    width: MENU.width,
    height: MENU_HEIGHT,
    paddingVertical: MENU.paddingVertical,
  },
  row: {
    height: MENU.itemHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: MENU.iconInset,
  },
  well: {
    width: MENU.iconWell,
    height: MENU.iconWell,
    borderRadius: MENU.iconWell / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.iconWell,
  },
  label: {
    marginLeft: MENU.labelGap,
    color: COLORS.text,
    fontSize: MENU.labelSize,
    letterSpacing: -0.2,
  },
});
