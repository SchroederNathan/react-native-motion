import { loadOnboardingState } from '@/components/onboarding/use-onboarding';
import { ThemeProvider } from '@/theme';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  useFonts,
} from '@expo-google-fonts/manrope';
import * as Linking from 'expo-linking';
import { ObserveRoot, useObserve } from 'expo-observe';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { PlatformColor } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

const isIOS = process.env.EXPO_OS === 'ios';

function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [shouldOnboard, setShouldOnboard] = useState(false);
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
        const [initialUrl, hasOnboarded] = await Promise.all([
          Linking.getInitialURL(),
          loadOnboardingState(),
        ]);
        // A deep link into a specific animation (QR / universal link) must reach
        // that screen even on first launch — never intercept it with onboarding.
        const launchedToContent = !!initialUrl && initialUrl.includes('/animations/');
        setShouldOnboard(!hasOnboarded && !launchedToContent);
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

  useEffect(() => {
    if (isReady && shouldOnboard) {
      router.replace('/onboarding');
    }
  }, [isReady, shouldOnboard]);

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
