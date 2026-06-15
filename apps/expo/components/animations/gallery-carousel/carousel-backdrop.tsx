import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

/**
 * Ambient color wash behind the carousel. Crossfades between the previous and
 * current card color whenever the active index changes, then fades out into the
 * app background toward the bottom. A dependency-free stand-in for the website's
 * blurred image backdrop.
 */
export function CarouselBackdrop({
  colors,
  currentIndex,
  backgroundColor,
  height = 340,
}: {
  colors: string[];
  currentIndex: number;
  backgroundColor: string;
  height?: number;
}) {
  const [displayedIndex, setDisplayedIndex] = useState(currentIndex);
  const [previousIndex, setPreviousIndex] = useState(currentIndex);
  const fade = useSharedValue(1);

  useEffect(() => {
    if (currentIndex !== displayedIndex) {
      setPreviousIndex(displayedIndex);
      setDisplayedIndex(currentIndex);
      fade.set(0);
      fade.set(
        withTiming(1, { duration: 500 }, (finished) => {
          if (finished) {
            scheduleOnRN(setPreviousIndex, currentIndex);
          }
        }),
      );
    }
  }, [currentIndex, displayedIndex, fade]);

  const foregroundStyle = useAnimatedStyle(() => ({ opacity: fade.get() }));

  return (
    <View style={[styles.backdrop, { height }]} pointerEvents="none">
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: colors[previousIndex] },
        ]}
      />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: colors[displayedIndex] },
          foregroundStyle,
        ]}
      />
      {/* Soften the wash and dissolve it into the page background. */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            experimental_backgroundImage: `linear-gradient(to bottom, ${backgroundColor}00 0%, ${backgroundColor}66 55%, ${backgroundColor} 100%)`,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
});
