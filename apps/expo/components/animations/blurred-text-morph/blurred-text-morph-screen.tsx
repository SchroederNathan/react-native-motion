import { Button } from '@/components/button';
import { ThemeProvider, useTheme } from '@/theme';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MorphingText } from './morphing-text';
import { blurredTextMorphTheme } from './theme';
import { WORDS } from './words';

const HEADLINE_SIZE = 52;
const HEADLINE_HEIGHT = 84;
/** Clears the transparent native header that the route draws over this screen. */
const HEADER_CLEARANCE = 48;

function BlurredTextMorphContent() {
  const { width } = useWindowDimensions();
  const { colors, theme, tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const [index, setIndex] = useState(0);
  const next = useCallback(() => setIndex((i) => (i + 1) % WORDS.length), []);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + HEADER_CLEARANCE,
        paddingBottom: insets.bottom + tokens.spacing.xl,
        paddingHorizontal: tokens.spacing.xl,
      }}
    >
      <View style={styles.headline}>
        <MorphingText
          text={WORDS[index]}
          fitTexts={WORDS}
          width={width - tokens.spacing.xl * 2}
          height={HEADLINE_HEIGHT}
          fontSize={HEADLINE_SIZE}
          color={colors.text}
          fallbackFontFamily={theme.fonts.semibold}
        />
      </View>

      <View style={{ gap: tokens.spacing.xl }}>
        <Text
          style={{
            color: colors.textSecondary,
            fontFamily: theme.fonts.regular,
            fontSize: tokens.fontSize.caption,
            textAlign: 'center',
            lineHeight: 20,
          }}
        >
          Letters the two phrases share glide to their new position. The rest blur
          out and blur in, one after another.
        </Text>

        <Button label="Next phrase" onPress={next} />
      </View>
    </View>
  );
}

/** Self-contained screen: wraps itself in its own per-animation theme. */
export function BlurredTextMorphScreen() {
  return (
    <ThemeProvider theme={blurredTextMorphTheme}>
      <BlurredTextMorphContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  headline: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
