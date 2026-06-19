import { Stack } from 'expo-router';
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow';

export default function OnboardingScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <OnboardingFlow />
    </>
  );
}
