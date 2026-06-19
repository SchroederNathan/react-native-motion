import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { coreTheme, ThemeProvider, useTheme } from '@/theme';
import { router } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useRef, useState } from 'react';
import {
  type FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OnboardingDots } from './onboarding-dots';
import { stages } from './stages';
import { StaggeredText } from './staggered-text';
import { useOnboarding } from './use-onboarding';

const TITLE_HEIGHT = 92;

function OnboardingContent() {
  const { width, height } = useWindowDimensions();
  const { colors, theme, tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { complete } = useOnboarding();

  const listRef = useRef<FlatList<(typeof stages)[number]>>(null);

  // Text + dot animations run on the UI thread off this shared value.
  const activeIndex = useSharedValue(0);

  // JS state is used ONLY for the button label / scroll target (not animation).
  const [index, setIndex] = useState(0);
  const isLast = index === stages.length - 1;

  // Reserve the bottom area (title + dots + button) so the art centers above it.
  const bottomReserved = insets.bottom + 210;
  const lottieSize = Math.min(width * 0.78, height - bottomReserved - insets.top, 340);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      // Flip the active index at the halfway point so the text cross-animates.
      activeIndex.set(Math.floor(event.contentOffset.x / width + 0.5));
    },
  });

  const onMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  const finish = async () => {
    await complete();
    router.replace('/');
  };

  const onNext = async () => {
    if (isLast) {
      await finish();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Animated.FlatList
        ref={listRef}
        data={stages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={{
              width,
              height,
              paddingTop: insets.top,
              paddingBottom: bottomReserved,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LottieView
              source={item.lottie}
              autoPlay
              loop
              style={{ width: lottieSize, height: lottieSize }}
            />
          </View>
        )}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        onMomentumScrollEnd={onMomentumEnd}
        scrollEventThrottle={16}
        bounces={false}
      />

      {/* Skip — top-right, dismisses onboarding straight to the gallery. */}
      <Pressable
        onPress={finish}
        hitSlop={tokens.spacing.md}
        accessibilityRole="button"
        accessibilityLabel="Skip onboarding"
        style={({ pressed }) => [
          styles.skip,
          {
            top: insets.top + tokens.spacing.sm,
            right: tokens.spacing.xl,
            opacity: pressed ? 0.5 : 1,
          },
        ]}
      >
        <Text
          style={{
            color: colors.text,
            fontFamily: theme.fonts.semibold,
            fontSize: tokens.fontSize.body,
            paddingBottom: 2,
          }}
        >
          Skip
        </Text>
        <Icon name="chevron-right" size={24} color={colors.text} />
      </Pressable>

      <View
        pointerEvents="box-none"
        style={[
          styles.bottom,
          { paddingHorizontal: tokens.spacing.xl, paddingBottom: insets.bottom + tokens.spacing.lg },
        ]}
      >
        {/* Primary text — stacked, left-aligned, sitting just above the dots. */}
        <View style={{ height: TITLE_HEIGHT }} pointerEvents="none">
          {stages.map((stage, i) => (
            <View key={stage.id} style={styles.titleItem}>
              <StaggeredText
                text={stage.title}
                activeIndex={activeIndex}
                itemIndex={i}
                align="left"
                color={colors.text}
                fontFamily={theme.fonts.semibold}
                fontSize={tokens.fontSize.largeTitle}
              />
            </View>
          ))}
        </View>

        <View style={{ marginTop: tokens.spacing.xl, marginBottom: tokens.spacing['4xl'] }}>
          <OnboardingDots count={stages.length} activeIndex={activeIndex} />
        </View>

        <Button onPress={onNext} label={'Continue'} />
      </View>
    </View>
  );
}

/** Self-contained onboarding flow, wrapped in its own accent theme. */
export function OnboardingFlow() {
  return (
    <ThemeProvider theme={coreTheme}>
      <OnboardingContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  skip: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  titleItem: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'flex-start',
  },
});
