import { ThemeProvider } from '@/theme';
import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type TextInput,
} from 'react-native';
import {
  KeyboardController,
  OverKeyboardView,
  useKeyboardHandler,
  useReanimatedKeyboardAnimation,
} from 'react-native-keyboard-controller';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { AttachmentMenu, type MenuAction } from './attachment-menu';
import { AttachmentPanel } from './attachment-panel';
import { Composer } from './composer';
import {
  COLORS,
  COMPOSER,
  DURATION,
  EASE_FADE,
  EASE_OUT,
  GUTTER,
  MENU,
  MENU_HEIGHT,
  SPRING,
} from './constants';
import { PhotoGrid, PhotoGridBar } from './photo-grid';
import { chatgptAttachmentsTheme } from './theme';
import { usePhotoLibrary, type LibraryPhoto } from './use-photo-library';

type Mode = 'closed' | 'menu' | 'photos';

/** Chat history rows sitting above the composer, as in the reference. */
const SUGGESTIONS = ['Audit TestFlight review risk', 'Gym week planner'];

function ChatGptAttachmentsContent() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const keyboard = useReanimatedKeyboardAnimation();
  const { photos, status } = usePhotoLibrary();
  const inputRef = useRef<TextInput>(null);

  const [mode, setMode] = useState<Mode>('closed');
  const [selected, setSelected] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<LibraryPhoto[]>([]);
  const [flying, setFlying] = useState<LibraryPhoto | null>(null);
  /**
   * True for the length of a dismiss. The sheet is still mounted and still
   * collapsing, but its material is already on its way out — see `glass` below.
   * The flight into the composer does not need this: it drops the material
   * outright rather than fading it.
   */
  const [closing, setClosing] = useState(false);
  const [attachSlot, setAttachSlot] = useState(0);
  const [settledKeyboard, setSettledKeyboard] = useState(0);

  const open = useSharedValue(0);
  const morph = useSharedValue(0);
  const attach = useSharedValue(0);
  const menuOpacity = useSharedValue(1);
  const gridOpacity = useSharedValue(0);
  const flyOpacity = useSharedValue(0);
  const blur = useSharedValue(0);
  /**
   * 0 no attachment strip → 1 strip open. Lives up here because two views need
   * it: the composer, which grows around it, and the panel, which has to know
   * where the slot it is flying into currently is.
   */
  const strip = useSharedValue(0);

  /**
   * `height` is negative while the keyboard is up, which is what makes it drop
   * straight into a translate. Everything positions itself off this, so the
   * composer and the panel never disagree about where the bottom of the screen
   * effectively is.
   */
  const liftedBy = useDerivedValue(
    () => Math.max(-keyboard.height.get(), insets.bottom) + COMPOSER.keyboardGap,
  );
  const composerBottom = useDerivedValue(() => height - liftedBy.get());
  const composerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -liftedBy.get() }],
  }));

  // Adding the first attachment opens the strip; removing the last one shuts
  // it. Either way the composer's bottom edge is pinned, so this is the whole
  // of its height change.
  const hasAttachments = attachments.length > 0;
  useEffect(() => {
    strip.set(withSpring(hasAttachments ? 1 : 0, SPRING.strip));
  }, [hasAttachments, strip]);

  /**
   * The suggestion rows go where the strip comes from, so they leave as it
   * arrives. Measured rather than assumed: they are two rows of text, and text
   * is the one thing here whose height is not ours to decide.
   */
  const [suggestionsHeight, setSuggestionsHeight] = useState(0);
  const suggestionsStyle = useAnimatedStyle(() => ({
    height: (1 - strip.get()) * suggestionsHeight,
    opacity: 1 - strip.get(),
  }));

  // The grid is laid out in React, so it needs the settled keyboard height as
  // a plain number. It only matters once the keyboard has stopped moving.
  useKeyboardHandler(
    {
      onEnd: (event) => {
        'worklet';
        scheduleOnRN(setSettledKeyboard, event.height);
      },
    },
    [],
  );

  // The keyboard is up for the whole reference recording, and the menu's anchor
  // is measured against it — so bring it up on arrival.
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, []);

  const settledBottom = height - Math.max(settledKeyboard, insets.bottom) - COMPOSER.keyboardGap;
  const panelTop = settledBottom - COMPOSER.rowHeight / 2 + MENU.centerOffset - MENU_HEIGHT / 2;
  // The sheet keeps the composer's gutter rather than going full bleed, the way
  // the reference does — so the grid is laid out that much narrower.
  const gridWidth = width - GUTTER * 2;
  // The sheet stops a gutter short of the bottom of the screen, so the grid
  // laid out inside it has to as well — see the panel's `rect`.
  const gridHeight = height - panelTop - GUTTER;

  /**
   * Tearing down the over-keyboard window drops the keyboard with it, while
   * leaving the field logically focused — which means a later tap on the field
   * is a no-op and the keyboard never returns. Restoring focus as the sheet
   * closes keeps it up, the way it stays up for the whole reference recording.
   */
  const closeSheet = useCallback(() => {
    setMode('closed');
    setClosing(false);
    KeyboardController.setFocusTo('current');
  }, []);

  /** Soften, then sharpen: the panel blurs through every change it makes. */
  const pulseBlur = useCallback(() => {
    blur.set(
      withSequence(
        withTiming(1, { duration: 60, easing: EASE_OUT }),
        withTiming(0, { duration: DURATION.blur, easing: EASE_FADE }),
      ),
    );
  }, [blur]);

  const openMenu = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode('menu');
    morph.set(0);
    attach.set(0);
    flyOpacity.set(0);
    gridOpacity.set(0);
    menuOpacity.set(1);
    blur.set(1);
    // A spring rather than a curve because the panel starts as the circle
    // around the + button: an ease-out is already a fifth of the way out by the
    // second frame and the circle is never seen, where a spring holds small
    // long enough to read it.
    open.set(withSpring(1, SPRING.panel));
    blur.set(withTiming(0, { duration: DURATION.blur, easing: EASE_FADE }));
  }, [attach, blur, flyOpacity, gridOpacity, menuOpacity, morph, open]);

  const dismiss = useCallback(() => {
    setSelected([]);
    // Hands the material to its own native transition for the way out, so it
    // fades over the same stretch the panel takes to collapse into the + button
    // rather than staying solid until the sheet is torn out from under it. Its
    // opacity is the one thing that cannot carry this — a `GlassView` under an
    // animated opacity renders nothing at all, even at 1.
    setClosing(true);
    blur.set(withTiming(1, { duration: DURATION.panel, easing: EASE_FADE }));
    // `panelOut`, not `panel`: the sheet is leaving, and a bounce on the way
    // out would be the panel arguing with the tap that dismissed it.
    morph.set(withSpring(0, SPRING.panelOut));
    menuOpacity.set(withTiming(1, { duration: DURATION.crossfade, easing: EASE_FADE }));
    gridOpacity.set(withTiming(0, { duration: DURATION.crossfade, easing: EASE_FADE }));
    open.set(
      withSpring(0, SPRING.panelOut, (finished) => {
        'worklet';
        if (finished) scheduleOnRN(closeSheet);
      }),
    );
  }, [blur, closeSheet, gridOpacity, menuOpacity, morph, open]);

  const showPhotos = useCallback(() => {
    setMode('photos');
    pulseBlur();
    morph.set(withSpring(1, SPRING.panel));
    menuOpacity.set(withTiming(0, { duration: DURATION.crossfade, easing: EASE_FADE }));
    gridOpacity.set(withTiming(1, { duration: DURATION.crossfade, easing: EASE_FADE }));
  }, [gridOpacity, menuOpacity, morph, pulseBlur]);

  const backToMenu = useCallback(() => {
    setMode('menu');
    setSelected([]);
    pulseBlur();
    morph.set(withSpring(0, SPRING.panel));
    menuOpacity.set(withTiming(1, { duration: DURATION.crossfade, easing: EASE_FADE }));
    gridOpacity.set(withTiming(0, { duration: DURATION.crossfade, easing: EASE_FADE }));
  }, [gridOpacity, menuOpacity, morph, pulseBlur]);

  const onMenuAction = useCallback(
    (action: MenuAction) => {
      // Only Photos has somewhere to go in this demo; the rest just close.
      if (action === 'photos') showPhotos();
      else dismiss();
    },
    [dismiss, showPhotos],
  );

  const togglePhoto = useCallback((photo: LibraryPhoto) => {
    Haptics.selectionAsync();
    setSelected((prev) =>
      prev.includes(photo.id) ? prev.filter((id) => id !== photo.id) : [...prev, photo.id],
    );
  }, []);

  /** Runs when the flight lands, handing the thumbnail over to the composer. */
  const settleAttachment = useCallback(() => {
    setFlying(null);
    // Cleared here rather than on the tap: it invalidates every cell in the
    // grid, and that commit lands on the same frame the flight starts.
    setSelected([]);
    closeSheet();
    open.set(0);
    morph.set(0);
    attach.set(0);
    flyOpacity.set(0);
    gridOpacity.set(0);
    menuOpacity.set(1);
    blur.set(0);
  }, [attach, blur, closeSheet, flyOpacity, gridOpacity, menuOpacity, morph, open]);

  const confirmSelection = useCallback(() => {
    const picked = selected
      .map((id) => photos.find((photo) => photo.id === id))
      .filter((photo): photo is LibraryPhoto => !!photo)
      // The grid does not know what is already in the composer, so the same
      // photo can be picked twice across two visits. Its id is the strip's
      // React key, and two rows under one key is what breaks their layout
      // animations — the second copy simply does not get attached.
      .filter((photo) => !attachments.some((existing) => existing.id === photo.id));
    if (!picked.length) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAttachSlot(attachments.length);
    setFlying(picked[0]);
    setAttachments((prev) => [...prev, ...picked]);

    flyOpacity.set(withTiming(1, { duration: DURATION.crossfade, easing: EASE_FADE }));
    gridOpacity.set(withTiming(0, { duration: DURATION.crossfade, easing: EASE_FADE }));
    attach.set(
      withSpring(1, SPRING.attach, (finished) => {
        'worklet';
        if (finished) scheduleOnRN(settleAttachment);
      }),
    );
  }, [attach, attachments, flyOpacity, gridOpacity, photos, selected, settleAttachment]);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((photo) => photo.id !== id));
  }, []);


  // Mounted as soon as a photo is picked so its decode is already paid for by
  // the time the panel flies; `flying` only decides when it becomes visible.
  const flyingPhoto =
    flying ?? photos.find((photo) => photo.id === selected[0]) ?? null;

  const onPlusPress = useCallback(() => {
    if (mode === 'closed') openMenu();
    else dismiss();
  }, [dismiss, mode, openMenu]);

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{ headerTintColor: COLORS.text, headerTitleStyle: styles.headerTitle }}
      />

      <Animated.View style={[styles.bottom, composerStyle]}>
        <Animated.View pointerEvents="none" style={[styles.suggestions, suggestionsStyle]}>
          <View
            onLayout={(event) => setSuggestionsHeight(event.nativeEvent.layout.height)}
            style={styles.suggestionsContent}
          >
            {SUGGESTIONS.map((label) => (
              <View key={label} style={styles.suggestion}>
                <View style={styles.suggestionDot} />
                <Text style={styles.suggestionLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Composer
          ref={inputRef}
          attachments={attachments}
          strip={strip}
          // The composer's own thumbnail stays blank until the panel finishes
          // landing on it, so the photo is never on screen twice.
          pendingId={flying?.id ?? null}
          onPlusPress={onPlusPress}
          onRemove={removeAttachment}
        />
      </Animated.View>

      {/* The sheet overlaps the keyboard by design — the menu's bottom two rows
          sit over it — so it has to be hosted in the window above it. */}
      <OverKeyboardView visible={mode !== 'closed'}>
        {mode !== 'closed' ? (
          <View style={StyleSheet.absoluteFill}>
            <Pressable
              accessibilityLabel="Close attachment menu"
              onPress={dismiss}
              style={StyleSheet.absoluteFill}
            />
            <AttachmentPanel
              screenWidth={width}
              screenHeight={height}
              gridWidth={gridWidth}
              gridHeight={gridHeight}
              interactive={flying ? 'none' : mode === 'photos' ? 'grid' : 'menu'}
              attachSlot={attachSlot}
              flying={flyingPhoto}
              isFlying={!!flying}
              // The material is the panel's, not the menu's: it stays on
              // through the morph so the grid has the same surface behind its
              // cells and in the gaps between them, and goes only once the
              // sheet is on its way out.
              glass={!closing}
              // One number: every move the panel makes is the same spring, so
              // the material has only one pace to keep.
              glassDuration={DURATION.panel / 1000}
              open={open}
              morph={morph}
              attach={attach}
              menuOpacity={menuOpacity}
              gridOpacity={gridOpacity}
              flyOpacity={flyOpacity}
              blur={blur}
              strip={strip}
              composerBottom={composerBottom}
              menu={<AttachmentMenu onSelect={onMenuAction} />}
              grid={
                <PhotoGrid
                  width={gridWidth}
                  height={gridHeight}
                  photos={photos}
                  status={status}
                  selected={selected}
                  onTogglePhoto={togglePhoto}
                />
              }
            />

            {/* The grid's floating controls live beside the panel, not inside
                it. They are glass, and glass anywhere below the panel's
                animated layers comes out flat — no rim, no refraction. Out
                here they sit at the bottom of the window, which is where the
                reference keeps them the whole time they are up. */}
            <PhotoGridBar
              width={gridWidth}
              selected={selected}
              active={mode === 'photos' && !flying}
              fade={gridOpacity}
              onBack={backToMenu}
              onConfirm={confirmSelection}
            />
          </View>
        ) : null}
      </OverKeyboardView>
    </View>
  );
}

/** Self-contained screen: wraps itself in its own per-animation theme. */
export function ChatGptAttachmentsScreen() {
  return (
    <ThemeProvider theme={chatgptAttachmentsTheme}>
      <ChatGptAttachmentsContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerTitle: {
    color: COLORS.text,
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  suggestions: {
    // Clipped so the rows are eaten by the composer growing into them rather
    // than squashed. `suggestionsContent` keeps its own height inside.
    overflow: 'hidden',
  },
  suggestionsContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: GUTTER + 16,
    paddingBottom: 18,
    gap: 18,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  suggestionDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  suggestionLabel: {
    color: COLORS.text,
    fontSize: 17,
  },
});
