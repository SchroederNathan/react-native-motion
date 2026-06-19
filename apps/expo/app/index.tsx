import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { Alert, Pressable } from 'react-native';
import { AnimationList } from '@/components/animation-list';
import { useOnboarding } from '@/components/onboarding/use-onboarding';
import { useTheme } from '@/theme';

const isIOS = process.env.EXPO_OS === 'ios';

function showAbout() {
  Alert.alert(
    'React Native Motion',
    'A gallery of React Native animations. Scroll the list — whichever preview is most in view plays automatically.',
  );
}

function InfoButton() {
  const { colors } = useTheme();
  return (
    <Pressable onPress={showAbout} hitSlop={12}>
      <Image
        source="sf:info.circle"
        tintColor={colors.tint}
        style={{ width: 24, height: 24 }}
      />
    </Pressable>
  );
}

/** Dev-only: clears the persisted onboarding flag and replays the flow. */
function ResetOnboardingButton() {
  const { colors } = useTheme();
  const { reset } = useOnboarding();
  return (
    <Pressable
      onPress={async () => {
        await reset();
        router.replace('/onboarding');
      }}
      hitSlop={12}
    >
      <Image
        source="sf:arrow.counterclockwise"
        tintColor={colors.tint}
        style={{ width: 24, height: 24 }}
      />
    </Pressable>
  );
}

export default function Index() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Animations',
          headerLeft: __DEV__ && isIOS ? () => <ResetOnboardingButton /> : undefined,
          headerRight: isIOS ? () => <InfoButton /> : undefined,
        }}
      />
      <AnimationList />
    </>
  );
}
