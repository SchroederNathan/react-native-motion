import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { Alert, Pressable } from 'react-native';
import { AnimationList } from '@/components/animation-list';
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

export default function Index() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Animations',
          headerRight: isIOS ? () => <InfoButton /> : undefined,
        }}
      />
      <AnimationList />
    </>
  );
}
