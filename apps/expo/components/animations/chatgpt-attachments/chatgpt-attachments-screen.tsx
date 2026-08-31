import { ThemeProvider } from '@/theme';
import type { CameraType, FlashMode } from 'expo-camera';
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
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { CameraBar } from './camera/camera-bar';
import { CameraSheet, type CameraSheetHandle } from './camera/camera-sheet';
import { AttachmentFlight, type Flight } from './composer/attachment-flight';
import { Composer } from './composer/composer';
import {
  COLORS,
  COMPOSER,
  DURATION,
  EASE_FADE,
  EASE_OUT,
  GRID,
  GUTTER,
  MENU,
  MENU_HEIGHT,
  SPRING,
} from './constants';
import { AttachmentMenu, type MenuAction } from './panel/attachment-menu';
import { AttachmentPanel } from './panel/attachment-panel';
import { PhotoGridBar } from './photos/photo-grid-bar';
import { PhotoGrid, type PhotoGridHandle } from './photos/photo-grid';
import { usePhotoLibrary, type LibraryPhoto } from './photos/use-photo-library';
import { chatgptAttachmentsTheme } from './theme';

type Mode = 'closed' | 'menu' | 'photos' | 'camera';

/**
 * What the panel turns into once it stops being the menu. Kept apart from
 * `mode`, because it has to outlive it: on the way back to the menu the sheet
 * is still crossfading out, and swapping its contents mid-fade would flash the
 * other sheet through it.
 */
type Sheet = 'photos' | 'camera';

/** Chat history rows sitting above the composer, as in the reference. */
const SUGGESTIONS = ['Audit TestFlight review risk', 'Gym week planner'];

function ChatGptAttachmentsContent() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const keyboard = useReanimatedKeyboardAnimation();
  const { photos, status } = usePhotoLibrary();
  const inputRef = useRef<TextInput>(null);
  const gridRef = useRef<PhotoGridHandle>(null);
  const cameraRef = useRef<CameraSheetHandle>(null);
  /** Pending panel mount, held back while the + gets out of the way. */
  const leadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [mode, setMode] = useState<Mode>('closed');
  const [sheet, setSheet] = useState<Sheet>('photos');
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  /** True from the shutter tap until the capture is in hand — one at a time. */
  const capturing = useRef(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<LibraryPhoto[]>([]);
  /** The photos currently crossing from the grid to the composer. */
  const [flights, setFlights] = useState<Flight[]>([]);
  /**
   * True for the length of a close, whichever way it was asked for. The sheet
   * is still mounted and still collapsing, but its material is already on its
   * way out — see `glass` below.
   */
  const [closing, setClosing] = useState(false);
  const [settledKeyboard, setSettledKeyboard] = useState(0);

  const open = useSharedValue(0);
  /**
   * 0 the + is in place → 1 it has cleared the space the panel opens on. Its
   * own value rather than a read of `open`, because it deliberately runs out of
   * step with the panel: it leads on the way in and trails on the way out.
   */
  const plusOut = useSharedValue(0);
  const morph = useSharedValue(0);
  const attach = useSharedValue(0);
  const menuOpacity = useSharedValue(1);
  const gridOpacity = useSharedValue(0);
  const blur = useSharedValue(0);
  /**
   * 0 no attachment strip → 1 strip open. Lives up here because two views need
   * it: the composer, which grows around it, and the photos flying into it,
   * which have to know where the slot they are aiming at currently is.
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

  // Drops a lead-in still in flight if the screen goes away mid-open.
  useEffect(
    () => () => {
      if (leadTimer.current !== null) clearTimeout(leadTimer.current);
    },
    [],
  );

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

  /** Drops a queued lead-in, so a tap during it never lets the panel arrive. */
  const clearLead = useCallback(() => {
    if (leadTimer.current === null) return;
    clearTimeout(leadTimer.current);
    leadTimer.current = null;
  }, []);

  const openMenu = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // The + goes first and alone. The panel opens as the circle around that
    // glyph and is wider than it, so there is no size at which it can start
    // without covering the very thing that is trying to move out from under
    // it — it has to stay unmounted for the length of the lead.
    plusOut.set(withSpring(1, SPRING.panel));
    morph.set(0);
    attach.set(0);
    gridOpacity.set(0);
    menuOpacity.set(1);
    blur.set(1);
    clearLead();
    leadTimer.current = setTimeout(() => {
      leadTimer.current = null;
      setMode('menu');
      // A spring rather than a curve because the panel starts as the circle the
      // + just left: an ease-out is already a fifth of the way out by the second
      // frame and the circle is never seen, where a spring holds small long
      // enough to read it.
      open.set(withSpring(1, SPRING.panel));
      blur.set(withTiming(0, { duration: DURATION.blur, easing: EASE_FADE }));
    }, DURATION.plusLead);
  }, [attach, blur, clearLead, gridOpacity, menuOpacity, morph, open, plusOut]);

  const dismiss = useCallback(() => {
    clearLead();
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
    // The same order read backwards: the panel goes, then the + comes back into
    // the space it leaves. Delayed rather than slowed, so both directions are
    // the one spring.
    plusOut.set(withDelay(DURATION.plusLead, withSpring(0, SPRING.panelOut)));
  }, [blur, clearLead, closeSheet, gridOpacity, menuOpacity, morph, open, plusOut]);

  /**
   * Menu → sheet. The one morph, whatever the sheet is about to show: the
   * camera takes exactly the footprint the grid does, so the panel has one
   * shape to grow into and one spring to grow on.
   */
  const showSheet = useCallback(
    (next: Sheet) => {
      setSheet(next);
      setMode(next);
      pulseBlur();
      morph.set(withSpring(1, SPRING.panel));
      menuOpacity.set(withTiming(0, { duration: DURATION.crossfade, easing: EASE_FADE }));
      gridOpacity.set(withTiming(1, { duration: DURATION.crossfade, easing: EASE_FADE }));
    },
    [gridOpacity, menuOpacity, morph, pulseBlur],
  );

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
      // Photos and Camera have somewhere to go in this demo; the rest close.
      if (action === 'photos') showSheet('photos');
      else if (action === 'camera') showSheet('camera');
      else dismiss();
    },
    [dismiss, showSheet],
  );

  const togglePhoto = useCallback((photo: LibraryPhoto) => {
    Haptics.selectionAsync();
    setSelected((prev) =>
      prev.includes(photo.id) ? prev.filter((id) => id !== photo.id) : [...prev, photo.id],
    );
  }, []);

  /** Runs when the flight lands, handing the thumbnails over to the composer. */
  const settleAttachment = useCallback(() => {
    // The hand-off, on one commit: the flying copies come off in the same
    // breath the composer's own thumbnails stop being held back.
    setFlights([]);
    setSelected([]);
    closeSheet();
    // Everything the panel drove is reset outright — it is unmounted by now, so
    // there is nothing left to see it move. `plusOut` is deliberately untouched:
    // the + came back on its own spring while the photos flew, and it is on
    // screen.
    open.set(0);
    morph.set(0);
    attach.set(0);
    gridOpacity.set(0);
    menuOpacity.set(1);
    blur.set(0);
  }, [attach, blur, closeSheet, gridOpacity, menuOpacity, morph, open]);

  /**
   * Hands a set of photos to the composer and sends the sheet home. Shared by
   * the grid's confirm and the camera's shutter: both end the same way, with
   * copies flying out of wherever the photos were and the panel collapsing back
   * into the + button underneath them.
   */
  const attachAndLeave = useCallback(
    (leaving: Flight[]) => {
      setFlights(leaving);
      setAttachments((prev) => [...prev, ...leaving.map((flight) => flight.photo)]);

      // The sheet leaves the way any close leaves it — back into the + button,
      // on the spring with the bounce taken out. It is not carrying the photos
      // any more, so it has no reason to go anywhere else.
      setClosing(true);
      blur.set(withTiming(1, { duration: DURATION.panel, easing: EASE_FADE }));
      gridOpacity.set(withTiming(0, { duration: DURATION.crossfade, easing: EASE_FADE }));
      morph.set(withSpring(0, SPRING.panelOut));
      open.set(withSpring(0, SPRING.panelOut));
      plusOut.set(withDelay(DURATION.plusLead, withSpring(0, SPRING.panelOut)));

      // The photos go their own way, out of wherever they were sitting. The
      // sheet's collapse and this are the same length, so they read as one
      // move coming apart rather than two.
      attach.set(
        withSpring(1, SPRING.attach, (finished) => {
          'worklet';
          if (finished) scheduleOnRN(settleAttachment);
        }),
      );
    },
    [attach, blur, gridOpacity, morph, open, plusOut, settleAttachment],
  );

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

    // Where each photo is sitting, right now, on the frame it leaves. The grid
    // is inside the panel, which is at rest and fully morphed at this point, so
    // the panel's own frame is the offset from the window — no measure pass,
    // and nothing that can land a frame late.
    const bottom = composerBottom.get();
    const gridTop = bottom - COMPOSER.rowHeight / 2 + MENU.centerOffset - MENU_HEIGHT / 2;
    // Only used for a photo the list has not laid out — one scrolled far
    // enough out that it has no frame to leave from. The middle of the sheet
    // is the least wrong answer: it is where the sheet is collapsing towards.
    const cellSize = gridWidth / GRID.columns - GRID.gap;
    const fallback = {
      x: GUTTER + (gridWidth - cellSize) / 2,
      y: gridTop + (gridHeight - cellSize) / 2,
      w: cellSize,
      h: cellSize,
    };

    const base = attachments.length;
    attachAndLeave(
      picked.map((photo, index) => {
        const cell = gridRef.current?.measureCell(photo.id);
        return {
          photo,
          slot: base + index,
          from: cell
            ? { x: GUTTER + cell.x, y: gridTop + cell.y, w: cell.w, h: cell.h }
            : fallback,
        };
      }),
    );
  }, [attachAndLeave, attachments, composerBottom, gridHeight, gridWidth, photos, selected]);

  /**
   * The shutter. The picture leaves as the whole sheet: the preview's rect,
   * with the sheet's own corners, shrinking into the thumbnail's slot the same
   * way a grid cell does. The preview underneath is cut on the frame the copy
   * appears, so the capture is never on screen twice.
   */
  const capturePhoto = useCallback(async () => {
    if (capturing.current) return;
    capturing.current = true;
    try {
      const uri = await cameraRef.current?.takePicture();
      if (!uri) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // The sheet's frame, read on the frame it leaves. It is at rest and fully
      // morphed here, so this is the panel's own rect — no measure pass.
      const bottom = composerBottom.get();
      const sheetTop = bottom - COMPOSER.rowHeight / 2 + MENU.centerOffset - MENU_HEIGHT / 2;
      attachAndLeave([
        {
          photo: { id: uri },
          slot: attachments.length,
          from: { x: GUTTER, y: sheetTop, w: gridWidth, h: gridHeight },
          fromRadius: GRID.panelRadius,
        },
      ]);
    } finally {
      capturing.current = false;
    }
  }, [attachAndLeave, attachments.length, composerBottom, gridHeight, gridWidth]);

  const flipCamera = useCallback(() => {
    Haptics.selectionAsync();
    setFacing((was) => (was === 'back' ? 'front' : 'back'));
  }, []);

  const toggleFlash = useCallback(() => {
    Haptics.selectionAsync();
    setFlash((was) => (was === 'off' ? 'on' : 'off'));
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((photo) => photo.id !== id));
  }, []);

  const isFlying = flights.length > 0;

  const onPlusPress = useCallback(() => {
    // A lead-in is in flight for its whole length while `mode` is still shut,
    // so the ref is what says whether this tap is opening or closing.
    if (mode === 'closed' && leadTimer.current === null) openMenu();
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
          // Drives the + glyph out of the menu's way, a beat ahead of it.
          plusOut={plusOut}
          // The composer's own thumbnails stay blank until the flying copies
          // finish landing on them, so a photo is never on screen twice.
          pendingIds={flights.map((flight) => flight.photo.id)}
          onPlusPress={onPlusPress}
          onRemove={removeAttachment}
        />
      </Animated.View>

      {/* The sheet overlaps the keyboard by design — the menu's bottom two rows
          sit over it — so it has to be hosted in the window above it. */}
      <OverKeyboardView visible={mode !== 'closed'}>
        {mode !== 'closed' ? (
          // Nothing in here takes a touch once the photos are on their way:
          // the sheet is leaving, and a tap on the backdrop it is still
          // covering would start a second close on top of this one.
          <View pointerEvents={isFlying ? 'none' : 'box-none'} style={StyleSheet.absoluteFill}>
            <Pressable
              accessibilityLabel="Close attachment menu"
              onPress={dismiss}
              style={StyleSheet.absoluteFill}
            />
            <AttachmentPanel
              screenHeight={height}
              gridWidth={gridWidth}
              gridHeight={gridHeight}
              interactive={isFlying ? 'none' : mode === 'menu' ? 'menu' : 'grid'}
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
              menuOpacity={menuOpacity}
              gridOpacity={gridOpacity}
              blur={blur}
              composerBottom={composerBottom}
              menu={<AttachmentMenu onSelect={onMenuAction} />}
              grid={
                sheet === 'camera' ? (
                  <CameraSheet
                    ref={cameraRef}
                    width={gridWidth}
                    height={gridHeight}
                    facing={facing}
                    flash={flash}
                    // The preview is cut on the frame its copy starts flying.
                    lifting={isFlying}
                  />
                ) : (
                  <PhotoGrid
                    ref={gridRef}
                    width={gridWidth}
                    height={gridHeight}
                    photos={photos}
                    status={status}
                    selected={selected}
                    // The cells the flight is carrying are cut on the frame it
                    // starts. Their copies are leaving from that exact rect.
                    lifting={isFlying}
                    onTogglePhoto={togglePhoto}
                  />
                )
              }
            />

            {/* The grid's floating controls live beside the panel, not inside
                it. They are glass, and glass anywhere below the panel's
                animated layers comes out flat — no rim, no refraction. Out
                here they sit at the bottom of the window, which is where the
                reference keeps them the whole time they are up. */}
            {sheet === 'camera' ? (
              <CameraBar
                width={gridWidth}
                active={mode === 'camera' && !isFlying}
                fade={gridOpacity}
                flash={flash}
                onBack={backToMenu}
                onCapture={capturePhoto}
                onFlip={flipCamera}
                onToggleFlash={toggleFlash}
              />
            ) : (
              <PhotoGridBar
                width={gridWidth}
                selected={selected}
                active={mode === 'photos' && !isFlying}
                fade={gridOpacity}
                onBack={backToMenu}
                onConfirm={confirmSelection}
              />
            )}

            {/* Above the sheet, and outside its clip: the photos have left it,
                and the last third of the way is over the composer. */}
            <AttachmentFlight
              flights={flights}
              screenWidth={width}
              attach={attach}
              strip={strip}
              composerBottom={composerBottom}
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
