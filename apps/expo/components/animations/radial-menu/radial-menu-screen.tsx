import { FlashList } from '@shopify/flash-list';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@/theme';
import { ACTION_TITLES, ACTIONS, CARDS, type MediaCardItem } from './cards';
import { OverlayProvider } from './overlay-provider';
import { radialMenuTheme } from './theme';
import { useRadialOverlay } from './use-radial-overlay';

const CARD_RADIUS = 16;
const CELL_GAP = 10;
const CONTAINER_PADDING = 12;
// The stack header is translucent, so clear it like the other demo screens do.
const HEADER_CLEARANCE = 48;

/** The visual face of a media card — shared by the live card and its clone. */
function CardFace({ item }: { item: MediaCardItem }) {
  return (
    <View style={[styles.cardFace, { backgroundColor: item.color }]}>
      <Text style={styles.cardLabel} selectable={false}>
        {item.label}
      </Text>
    </View>
  );
}

function MediaCard({
  item,
  onSelect,
}: {
  item: MediaCardItem;
  onSelect: (item: MediaCardItem, actionId: string) => void;
}) {
  const cardRef = useRef<View>(null);

  const handleSelect = useCallback(
    (actionId: string) => onSelect(item, actionId),
    [item, onSelect],
  );

  const { longPressGesture, panGesture, overlayOpen } = useRadialOverlay({
    actions: ACTIONS,
    onSelect: handleSelect,
    targetRef: cardRef,
    renderClone: ({ x, y, width, height }) => (
      <View style={{ position: 'absolute', left: x, top: y, width, height }}>
        <CardFace item={item} />
      </View>
    ),
  });

  const gesture = Gesture.Simultaneous(longPressGesture, panGesture);

  // Hide the original while its clone is lifted into the overlay.
  const faceStyle = useAnimatedStyle(() => ({
    opacity: overlayOpen.get() === 1 ? 0 : 1,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View ref={cardRef} style={styles.cell} collapsable={false}>
        <Animated.View style={[styles.fill, faceStyle]}>
          <CardFace item={item} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

function RadialMenuContent() {
  const { colors, theme, tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [selection, setSelection] = useState<{
    label: string;
    action: string;
  } | null>(null);

  const handleSelect = useCallback((item: MediaCardItem, actionId: string) => {
    setSelection({ label: item.label, action: ACTION_TITLES[actionId] });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: MediaCardItem }) => (
      <MediaCard item={item} onSelect={handleSelect} />
    ),
    [handleSelect],
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View
        style={[styles.header, { paddingTop: insets.top + HEADER_CLEARANCE }]}
      >
        <Text
          style={{
            color: colors.text,
            fontFamily: theme.fonts.semibold,
            fontSize: tokens.fontSize.title,
            textAlign: 'center',
          }}
        >
          Press and hold a card
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontFamily: theme.fonts.regular,
            fontSize: tokens.fontSize.body,
            textAlign: 'center',
          }}
        >
          Drag to an action, release to select.
        </Text>
      </View>

      <FlashList
        data={CARDS}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{ padding: CONTAINER_PADDING }}
        showsVerticalScrollIndicator={false}
      />

      <View
        style={[
          styles.status,
          { paddingBottom: insets.bottom + tokens.spacing.lg },
        ]}
      >
        {selection ? (
          <Animated.Text
            key={`${selection.label}-${selection.action}`}
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={{
              color: colors.text,
              fontFamily: theme.fonts.medium,
              fontSize: tokens.fontSize.body,
            }}
          >
            <Text style={{ color: colors.tint }}>{selection.action}</Text>
            {`  ·  ${selection.label}`}
          </Animated.Text>
        ) : (
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: theme.fonts.regular,
              fontSize: tokens.fontSize.body,
            }}
          >
            No action yet
          </Text>
        )}
      </View>
    </View>
  );
}

/** Self-contained screen: its own theme + the blur/menu overlay provider. */
export function RadialMenuScreen() {
  return (
    <ThemeProvider theme={radialMenuTheme}>
      <OverlayProvider>
        <RadialMenuContent />
      </OverlayProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { gap: 6, paddingHorizontal: 24, paddingBottom: 12 },
  cell: {
    flex: 1,
    aspectRatio: 2 / 3,
    margin: CELL_GAP / 2,
  },
  fill: { flex: 1 },
  cardFace: {
    flex: 1,
    borderRadius: CARD_RADIUS,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    boxShadow: '0px 10px 20px -8px rgba(0, 0, 0, 0.35)',
  },
  cardLabel: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 18,
    fontWeight: '700',
  },
  status: { alignItems: 'center', minHeight: 24, paddingTop: 8 },
});
