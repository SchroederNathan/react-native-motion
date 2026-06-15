import { useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@/theme';
import { CarouselBackdrop } from './carousel-backdrop';
import { CARD_COLORS, CARDS } from './cards';
import { GalleryStackCarousel } from './gallery-stack-carousel';
import { galleryCarouselTheme } from './theme';

function GalleryCarouselContent() {
  const { colors, theme, tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <CarouselBackdrop
        colors={CARD_COLORS}
        currentIndex={activeIndex}
        backgroundColor={colors.background}
      />

      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          gap: tokens.spacing['2xl'],
          paddingBottom: insets.bottom + tokens.spacing.xl,
        }}
      >
        <GalleryStackCarousel
          items={CARDS}
          onIndexChange={setActiveIndex}
          onPressItem={(_item, index) => setActiveIndex(index)}
        />

        <Text
          style={{
            textAlign: 'center',
            color: colors.textSecondary,
            fontFamily: theme.fonts.medium,
            fontSize: tokens.fontSize.body,
            fontVariant: ['tabular-nums'],
          }}
        >
          Card {activeIndex + 1} of {CARDS.length}
        </Text>
      </View>
    </View>
  );
}

/** Self-contained screen: wraps itself in its own per-animation theme. */
export function GalleryCarouselScreen() {
  return (
    <ThemeProvider theme={galleryCarouselTheme}>
      <GalleryCarouselContent />
    </ThemeProvider>
  );
}
