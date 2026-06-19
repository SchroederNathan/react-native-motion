import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

export interface StaggeredTextProps {
  /** The text to reveal, one character at a time. */
  text: string;
  /** Current active stage (drives visibility on the UI thread). */
  activeIndex: SharedValue<number>;
  /** This text's stage index — it shows only when active. */
  itemIndex: number;
  /** Text color (hex). */
  color: string;
  /** Registered font family name (e.g. theme.fonts.bold). */
  fontFamily: string;
  /** Font size in points. */
  fontSize: number;
  /** Horizontal alignment of the characters. @default 'center' */
  align?: 'left' | 'center' | 'right';
}

const JUSTIFY = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
} as const;

type CharProps = {
  char: string;
  index: number;
  totalCount: number;
  progress: SharedValue<number>;
  color: string;
  fontFamily: string;
  fontSize: number;
};

function AnimatedChar({
  char,
  index,
  totalCount,
  progress,
  color,
  fontFamily,
  fontSize,
}: CharProps) {
  // Per-character delay produces the cascade. Spring tuned to match the alma
  // example 1:1 — low damping + high stiffness for a quick, snappy entrance.
  const charProgress = useDerivedValue(() =>
    withDelay(index * 10, withSpring(progress.get(), { damping: 100, stiffness: 1400 })),
  );

  const style = useAnimatedStyle(() => ({
    opacity: charProgress.get(),
    transform: [
      { translateX: interpolate(charProgress.get(), [0, 1], [-1, 0]) },
      {
        // Earlier characters start a touch higher for a natural flow.
        translateY: interpolate(
          charProgress.get(),
          [0, 1],
          [16 - index * (8 / Math.max(totalCount - 1, 1)), 0],
        ),
      },
      { scale: interpolate(charProgress.get(), [0, 1], [0.8, 1]) },
    ],
  }));

  return (
    <Animated.Text style={[{ color, fontFamily, fontSize }, style]}>
      {char === ' ' ? ' ' : char}
    </Animated.Text>
  );
}

/** Reveals `text` character-by-character, driven entirely by shared values. */
export function StaggeredText({
  text,
  activeIndex,
  itemIndex,
  color,
  fontFamily,
  fontSize,
  align = 'center',
}: StaggeredTextProps) {
  const progress = useSharedValue(0);

  // Slight delay lets the page snap settle before the cascade plays in.
  const show = useCallback(() => {
    if (progress.get() === 1) return;
    setTimeout(() => {
      progress.set(1);
    }, 250);
  }, [progress]);

  useAnimatedReaction(
    () => activeIndex.get(),
    (value) => {
      if (value === itemIndex) {
        scheduleOnRN(show);
      } else {
        // Hide immediately when this stage isn't active.
        progress.set(0);
      }
    },
  );

  const chars = [...text];
  const totalCount = chars.length;

  // Group characters into words so wrapping happens at spaces, never mid-word.
  // Each word is a non-wrapping row of chars; only the outer row wraps. A global
  // running index keeps the per-character stagger cascade continuous across words.
  const words = text.split(' ');
  let cursor = 0;

  return (
    <View style={[styles.row, { justifyContent: JUSTIFY[align] }]}>
      {words.map((word, wordIndex) => {
        const wordChars = [...word];
        const isLastWord = wordIndex === words.length - 1;
        // The trailing space is its own char so the outer row can break there.
        const spaceIndex = isLastWord ? -1 : cursor + wordChars.length;
        const node = (
          <View key={wordIndex} style={styles.word}>
            {wordChars.map((char, i) => (
              <AnimatedChar
                key={i}
                char={char}
                index={cursor + i}
                totalCount={totalCount}
                progress={progress}
                color={color}
                fontFamily={fontFamily}
                fontSize={fontSize}
              />
            ))}
            {!isLastWord && (
              <AnimatedChar
                char=" "
                index={spaceIndex}
                totalCount={totalCount}
                progress={progress}
                color={color}
                fontFamily={fontFamily}
                fontSize={fontSize}
              />
            )}
          </View>
        );
        cursor += wordChars.length + (isLastWord ? 0 : 1);
        return node;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignSelf: 'stretch' },
  // A word never breaks internally; the trailing space lives inside it so the
  // outer row wraps at word boundaries.
  word: { flexDirection: 'row' },
});
