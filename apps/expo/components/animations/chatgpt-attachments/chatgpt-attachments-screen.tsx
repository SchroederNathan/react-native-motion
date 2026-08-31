import { ThemeProvider } from '@/theme';
import type { CameraType, FlashMode } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type TextInput } from 'react-native';
import { OverKeyboardView } from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { CameraBar } from './camera/camera-bar';
import { CameraSheet, type CameraSheetHandle } from './camera/camera-sheet';
import { AttachmentFlight } from './composer/attachment-flight';
import { Composer } from './composer/composer';
import { COLORS, DURATION, GRID, GUTTER, sheetTopFromComposerBottom } from './constants';
import { AttachmentMenu } from './panel/attachment-menu';
import { AttachmentPanel } from './panel/attachment-panel';
import { PhotoGridBar } from './photos/photo-grid-bar';
import { PhotoGrid, type PhotoGridHandle } from './photos/photo-grid';
import { usePhotoLibrary, type LibraryPhoto } from './photos/use-photo-library';
import { chatgptAttachmentsTheme } from './theme';
import { useAttachmentFlights } from './use-attachment-flights';
import { useAttachmentPanel } from './use-attachment-panel';
import { useSheetGeometry } from './use-sheet-geometry';

/** Chat history rows sitting above the composer, as in the reference. */
const SUGGESTIONS = ['Audit TestFlight review risk', 'Gym week planner'];

function ChatGptAttachmentsContent() {
  const { width, height, composerBottom, composerStyle, gridWidth, gridHeight } =
    useSheetGeometry();
  const { photos, status } = usePhotoLibrary();
  const inputRef = useRef<TextInput>(null);
  const gridRef = useRef<PhotoGridHandle>(null);
  const cameraRef = useRef<CameraSheetHandle>(null);

  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  /** True from the shutter tap until the capture is in hand — one at a time. */
  const capturing = useRef(false);
  const [selected, setSelected] = useState<string[]>([]);
  const clearSelection = useCallback(() => setSelected([]), []);

  const panel = useAttachmentPanel({ onLeaveSheet: clearSelection });
  const { attachments, flights, isFlying, attach, strip, attachAndLeave, removeAttachment } =
    useAttachmentFlights({
      collapsePanel: panel.collapseForLeave,
      resetPanel: panel.resetAfterLeave,
      onSettled: clearSelection,
    });

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

  // The keyboard is up for the whole reference recording, and the menu's anchor
  // is measured against it — so bring it up on arrival.
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, []);

  const togglePhoto = useCallback((photo: LibraryPhoto) => {
    Haptics.selectionAsync();
    setSelected((prev) =>
      prev.includes(photo.id) ? prev.filter((id) => id !== photo.id) : [...prev, photo.id],
    );
  }, []);

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
    const gridTop = sheetTopFromComposerBottom(composerBottom.get());
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
      const sheetTop = sheetTopFromComposerBottom(composerBottom.get());
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
          plusOut={panel.plusOut}
          // The composer's own thumbnails stay blank until the flying copies
          // finish landing on them, so a photo is never on screen twice.
          pendingIds={flights.map((flight) => flight.photo.id)}
          onPlusPress={panel.onPlusPress}
          onRemove={removeAttachment}
        />
      </Animated.View>

      {/* The sheet overlaps the keyboard by design — the menu's bottom two rows
          sit over it — so it has to be hosted in the window above it. */}
      <OverKeyboardView visible={panel.mode !== 'closed'}>
        {panel.mode !== 'closed' ? (
          // Nothing in here takes a touch once the photos are on their way:
          // the sheet is leaving, and a tap on the backdrop it is still
          // covering would start a second close on top of this one.
          <View pointerEvents={isFlying ? 'none' : 'box-none'} style={StyleSheet.absoluteFill}>
            <Pressable
              accessibilityLabel="Close attachment menu"
              onPress={panel.dismiss}
              style={StyleSheet.absoluteFill}
            />
            <AttachmentPanel
              screenHeight={height}
              gridWidth={gridWidth}
              gridHeight={gridHeight}
              interactive={isFlying ? 'none' : panel.mode === 'menu' ? 'menu' : 'grid'}
              // The material is the panel's, not the menu's: it stays on
              // through the morph so the grid has the same surface behind its
              // cells and in the gaps between them, and goes only once the
              // sheet is on its way out.
              glass={!panel.closing}
              // One number: every move the panel makes is the same spring, so
              // the material has only one pace to keep.
              glassDuration={DURATION.panel / 1000}
              open={panel.open}
              morph={panel.morph}
              menuOpacity={panel.menuOpacity}
              gridOpacity={panel.gridOpacity}
              blur={panel.blur}
              composerBottom={composerBottom}
              menu={<AttachmentMenu onSelect={panel.onMenuAction} />}
              grid={
                panel.sheet === 'camera' ? (
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
            {panel.sheet === 'camera' ? (
              <CameraBar
                width={gridWidth}
                active={panel.mode === 'camera' && !isFlying}
                fade={panel.gridOpacity}
                flash={flash}
                onBack={panel.backToMenu}
                onCapture={capturePhoto}
                onFlip={flipCamera}
                onToggleFlash={toggleFlash}
              />
            ) : (
              <PhotoGridBar
                width={gridWidth}
                selected={selected}
                active={panel.mode === 'photos' && !isFlying}
                fade={panel.gridOpacity}
                onBack={panel.backToMenu}
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
