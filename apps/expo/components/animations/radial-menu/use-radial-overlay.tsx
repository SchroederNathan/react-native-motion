import * as Haptics from 'expo-haptics';
import { useCallback, type ReactNode, type RefObject } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useOverlay } from './overlay-provider';
import {
  EASE_OUT,
  MENU_CLOSE_MS,
  MENU_OPEN_MS,
  RadialMenu,
  type RadialActionDef,
} from './radial-menu';

const LONG_PRESS_MS = 500;

export interface CloneLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function useRadialOverlay({
  actions,
  onSelect,
  onCancel,
  targetRef,
  renderClone,
}: {
  actions: RadialActionDef[];
  onSelect: (id: string) => void;
  onCancel?: () => void;
  targetRef: RefObject<View | null>;
  renderClone: (layout: CloneLayout) => ReactNode;
}) {
  const { showOverlay, hideOverlay } = useOverlay();

  const cursorX = useSharedValue(0);
  const cursorY = useSharedValue(0);
  const releaseSignal = useSharedValue(0);
  const overlayOpen = useSharedValue(0);
  const isLongPressed = useSharedValue(false);
  // Whether the finger is on the screen, tracked from the first touch — the
  // release can land while the overlay is still mounting, and it must not be
  // lost (a swallowed release leaves the menu open with no way to close it).
  const pointerDown = useSharedValue(false);
  // Guards against double-firing a release while the close animation runs.
  const menuActive = useSharedValue(0);
  // Fan-out progress, owned here so the menu reliably plays in on open
  // regardless of how the overlay subtree mounts. On close the buttons don't
  // travel back — they fade out in place via `menuFade`.
  const menuProgress = useSharedValue(0);
  const menuFade = useSharedValue(1);

  // Keep `overlayOpen` at 1 until the close animation settles so the original
  // card stays hidden for the whole lifetime — it reappears exactly as the
  // clone unmounts, making the clone look like the one that moved.
  const handleSelect = useCallback(
    (id: string) => {
      menuActive.set(0);
      menuFade.set(withTiming(0, { duration: MENU_CLOSE_MS }));
      hideOverlay(() => overlayOpen.set(0));
      onSelect(id);
    },
    [hideOverlay, menuActive, menuFade, onSelect, overlayOpen],
  );

  const handleCancel = useCallback(() => {
    menuActive.set(0);
    menuFade.set(withTiming(0, { duration: MENU_CLOSE_MS }));
    hideOverlay(() => overlayOpen.set(0));
    onCancel?.();
  }, [hideOverlay, menuActive, menuFade, onCancel, overlayOpen]);

  // `measureInWindow` is async and JS-thread only, so the long-press worklet
  // hands the press point here to measure the card and mount the overlay.
  const openOverlayAt = useCallback(
    (pressX: number, pressY: number) => {
      targetRef.current?.measureInWindow((x, y, width, height) => {
        showOverlay(
          <View
            style={styles.layer}
            pointerEvents="box-none"
            // Hide the original only once the clone has actually laid out —
            // hiding it earlier leaves an empty cell for a frame (white flash).
            onLayout={() => {
              overlayOpen.set(1);
              // The finger may have lifted while the overlay was mounting;
              // that release predates the mount, so close right away.
              if (!pointerDown.get()) handleCancel();
            }}
          >
            {renderClone({ x, y, width, height })}
            <RadialMenu
              pressX={pressX}
              pressY={pressY}
              cursorX={cursorX}
              cursorY={cursorY}
              releaseSignal={releaseSignal}
              progress={menuProgress}
              fade={menuFade}
              actions={actions}
              onSelect={handleSelect}
              onCancel={handleCancel}
            />
          </View>,
        );
        // Always restart from collapsed so the fan-out plays on every open.
        releaseSignal.set(0);
        menuActive.set(1);
        menuProgress.set(0);
        menuFade.set(1);
        menuProgress.set(
          withTiming(1, { duration: MENU_OPEN_MS, easing: EASE_OUT }),
        );
      });
    },
    [
      actions,
      cursorX,
      cursorY,
      handleCancel,
      handleSelect,
      menuActive,
      menuFade,
      menuProgress,
      overlayOpen,
      pointerDown,
      releaseSignal,
      renderClone,
      showOverlay,
      targetRef,
    ],
  );

  const longPressGesture = Gesture.LongPress()
    .minDuration(LONG_PRESS_MS)
    .maxDistance(25)
    .onStart((event) => {
      'worklet';
      scheduleOnRN(Haptics.impactAsync, Haptics.ImpactFeedbackStyle.Medium);
      isLongPressed.set(true);
      cursorX.set(event.absoluteX);
      cursorY.set(event.absoluteY);
      scheduleOnRN(openOverlayAt, event.absoluteX, event.absoluteY);
    })
    .onFinalize(() => {
      'worklet';
      isLongPressed.set(false);
    });

  const panGesture = Gesture.Pan()
    .maxPointers(1)
    .activateAfterLongPress(LONG_PRESS_MS)
    .onBegin((e) => {
      'worklet';
      pointerDown.set(true);
      cursorX.set(e.absoluteX);
      cursorY.set(e.absoluteY);
    })
    .onUpdate((e) => {
      'worklet';
      cursorX.set(e.absoluteX);
      cursorY.set(e.absoluteY);
    })
    // `onFinalize`, not `onEnd`: it fires on every touch-up (and cancellation)
    // whether or not the pan activated, so a release can never be swallowed.
    .onFinalize(() => {
      'worklet';
      pointerDown.set(false);
      // Increment (never toggle) so a same-frame end/restart can't be missed.
      if (menuActive.get() === 1) {
        releaseSignal.set(releaseSignal.get() + 1);
      }
    });

  return { longPressGesture, panGesture, isLongPressed, overlayOpen };
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10000,
  },
});
