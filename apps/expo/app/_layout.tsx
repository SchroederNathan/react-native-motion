import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PlatformColor } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { ThemeProvider } from '@/theme';

const isIOS = process.env.EXPO_OS === 'ios';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider>
      <KeyboardProvider>
        <Stack
          screenOptions={{
            headerLargeTitle: true,
            headerTransparent: true,
            headerShadowVisible: false,
            headerLargeTitleShadowVisible: false,
            headerBlurEffect: 'none',
            headerLargeStyle: { backgroundColor: 'transparent' },
            headerTitleStyle: isIOS ? { color: PlatformColor('label') } : undefined,
          }}
        />
        <StatusBar style="auto" />
      </KeyboardProvider>
    </ThemeProvider>
  );
}
