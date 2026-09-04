import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ThemeProvider, useTheme } from '@/theme';
import { stackToastTheme } from './theme';
import { ToastProvider, useToast } from './toast-provider';

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

function StackToastContent() {
  const { colors, theme, tokens } = useTheme();
  const { showToast } = useToast();

  const showRandomToast = () => {
    const index = Math.floor(Math.random() * TOAST_MESSAGES.length);
    showToast({ message: TOAST_MESSAGES[index] });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.7}
        onPress={showRandomToast}
        style={styles.button}
      >
        <Text
          style={{
            color: '#FFFFFF',
            fontFamily: theme.fonts.semibold,
            fontSize: tokens.fontSize.body,
          }}
        >
          Show toast
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/** Self-contained screen: its own theme + the toast host provider. */
export function StackToastScreen() {
  return (
    <ThemeProvider theme={stackToastTheme}>
      <ToastProvider>
        <StackToastContent />
      </ToastProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
