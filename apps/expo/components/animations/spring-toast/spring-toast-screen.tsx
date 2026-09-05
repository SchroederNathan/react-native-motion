import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  SafeAreaInsetsContext,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@/theme';
import { stackToastTheme } from './theme';
import { ToastProvider, useToast, type ToastPosition } from './toast-provider';

// A mix of one-, two-, and three-line messages so the stack shows different
// heights.
const TOAST_MESSAGES = [
  'Changes saved',
  'Link copied',
  'Added to your library',
  'Reminder set',
  'Photo uploaded',
  'Download complete. The file is ready to open.',
  'Synced to every device signed in to this account.',
  'Your order is confirmed. A receipt is on its way to your inbox.',
  'Backup finished. 2,418 photos and 96 videos are now safe in the cloud and ready to restore.',
  'You are offline. Edits are saved on this device and will sync when a connection returns.',
] as const;

/** Height of the native stack header bar below the status bar. */
const HEADER_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : 56;

function StackToastContent() {
  const { colors, theme, tokens } = useTheme();
  const { showToast } = useToast();

  const showRandomToast = (position: ToastPosition) => {
    const index = Math.floor(Math.random() * TOAST_MESSAGES.length);
    showToast({ message: TOAST_MESSAGES[index], position });
  };

  const labelStyle = {
    color: '#FFFFFF',
    fontFamily: theme.fonts.semibold,
    fontSize: tokens.fontSize.body,
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.7}
        onPress={() => showRandomToast('top')}
        style={styles.button}
      >
        <Text style={labelStyle}>Toast from top</Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.7}
        onPress={() => showRandomToast('bottom')}
        style={styles.button}
      >
        <Text style={labelStyle}>Toast from bottom</Text>
      </TouchableOpacity>
    </View>
  );
}

/** Self-contained screen: its own theme + the toast host provider. */
export function StackToastScreen() {
  const insets = useSafeAreaInsets();
  // This route draws a native header. Toasts measure from the safe area, so
  // extend the top inset past the header; otherwise a top toast sits under the
  // back button and the header takes the start of its drag.
  const toastInsets = { ...insets, top: insets.top + HEADER_BAR_HEIGHT };

  return (
    <ThemeProvider theme={stackToastTheme}>
      <SafeAreaInsetsContext.Provider value={toastInsets}>
        <ToastProvider>
          <StackToastContent />
        </ToastProvider>
      </SafeAreaInsetsContext.Provider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  button: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: '#000000',
  },
});
