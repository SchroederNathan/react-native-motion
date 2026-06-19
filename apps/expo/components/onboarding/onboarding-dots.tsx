import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';

function Dot({ index, activeIndex }: { index: number; activeIndex: SharedValue<number> }) {
  const { colors } = useTheme();

  const style = useAnimatedStyle(() => {
    const isActive = Math.round(activeIndex.get()) === index;
    return {
      width: withTiming(isActive ? 22 : 8),
      backgroundColor: withTiming(isActive ? colors.tint : colors.border),
    };
  });

  return <Animated.View style={[styles.dot, style]} />;
}

export function OnboardingDots({
  count,
  activeIndex,
}: {
  count: number;
  activeIndex: SharedValue<number>;
}) {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }, (_, index) => (
        <Dot key={index} index={index} activeIndex={activeIndex} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 6 },
  dot: { height: 8, borderRadius: 4 },
});
