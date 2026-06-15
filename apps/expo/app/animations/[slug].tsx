import { Stack, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { animationScreens } from '@/components/animations/registry';
import { animations } from '@/data/animations';
import { useTheme } from '@/theme';

function ComingSoon({ title }: { title: string }) {
  const { colors, theme, tokens } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: tokens.spacing.xl,
        gap: tokens.spacing.sm,
        backgroundColor: colors.background,
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontFamily: theme.fonts.semibold,
          fontSize: tokens.fontSize.title,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: colors.textSecondary,
          fontFamily: theme.fonts.regular,
          fontSize: tokens.fontSize.body,
          textAlign: 'center',
        }}
      >
        This demo hasn't been built yet.
      </Text>
    </View>
  );
}

export default function AnimationDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const animation = animations.find((a) => a.slug === slug);
  const title = animation?.title ?? 'Animation';
  const Screen = slug ? animationScreens[slug] : undefined;

  return (
    <>
      <Stack.Screen
        options={{
          title,
          headerLargeTitle: false,
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      {Screen ? <Screen /> : <ComingSoon title={title} />}
    </>
  );
}
