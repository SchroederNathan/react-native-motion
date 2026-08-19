import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ThemeProvider, useTheme } from '@/theme';
import { stackToastTheme } from './theme';
import { ToastProvider, useToast } from './toast-provider';

const TOAST_MESSAGES = [
  'Changes saved',
  'Link copied',
  'Added to your library',
  'Reminder set',
  'Download complete',
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
