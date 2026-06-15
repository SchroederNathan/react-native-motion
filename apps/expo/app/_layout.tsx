import { ThemeProvider } from '@/theme';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { ObserveRoot, useObserve } from 'expo-observe';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { PlatformColor } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

const isIOS = process.env.EXPO_OS === 'ios';

function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const { markInteractive } = useObserve();

  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  useEffect(() => {
    async function prepare() {
      try {
      } catch (e) {
        console.warn(e);
      } finally {
        setIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (isReady) {
      markInteractive();
    }
  }, [isReady, markInteractive]);

  if (!fontsLoaded || !isReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
    </GestureHandlerRootView>
  );
}

export default ObserveRoot.wrap(RootLayout);
