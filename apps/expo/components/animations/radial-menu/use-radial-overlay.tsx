import * as Haptics from 'expo-haptics';
import { useCallback, type ReactNode, type RefObject } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useOverlay } from './overlay-provider';
import { RadialMenu, type RadialActionDef } from './radial-menu';

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
  // Fan-out progress, owned here so the menu reliably springs in on open and
  // collapses back in on close regardless of how the overlay subtree mounts.
  const menuProgress = useSharedValue(0);

  // Keep `overlayOpen` at 1 until the close spring settles so the original card
  // stays hidden for the whole lifetime — it reappears exactly as the clone
  // unmounts, making the clone look like the one that moved.
  const handleSelect = useCallback(
    (id: string) => {
      menuProgress.set(withSpring(0));
      hideOverlay(() => overlayOpen.set(0));
      onSelect(id);
    },
    [hideOverlay, menuProgress, onSelect, overlayOpen],
  );

  const handleCancel = useCallback(() => {
    menuProgress.set(withSpring(0));
    hideOverlay(() => overlayOpen.set(0));
    onCancel?.();
  }, [hideOverlay, menuProgress, onCancel, overlayOpen]);

  // `measureInWindow` is async and JS-thread only, so the long-press worklet
  // hands the press point here to measure the card and mount the overlay.
  const openOverlayAt = useCallback(
    (pressX: number, pressY: number) => {
      targetRef.current?.measureInWindow((x, y, width, height) => {
        showOverlay(
          <View style={styles.layer} pointerEvents="box-none">
            {renderClone({ x, y, width, height })}
            <RadialMenu
              pressX={pressX}
              pressY={pressY}
              cursorX={cursorX}
              cursorY={cursorY}
              releaseSignal={releaseSignal}
              progress={menuProgress}
              actions={actions}
              onSelect={handleSelect}
              onCancel={handleCancel}
            />
          </View>,
        );
        overlayOpen.set(1);
        // Always restart from collapsed so the fan-out plays on every open.
        menuProgress.set(0);
        menuProgress.set(withSpring(1));
      });
    },
    [
      actions,
      cursorX,
      cursorY,
      handleCancel,
      handleSelect,
      menuProgress,
      overlayOpen,
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
      cursorX.set(e.absoluteX);
      cursorY.set(e.absoluteY);
    })
    .onUpdate((e) => {
      'worklet';
      cursorX.set(e.absoluteX);
      cursorY.set(e.absoluteY);
    })
    .onEnd(() => {
      'worklet';
      // Increment (never toggle) so a same-frame end/restart can't be missed.
      if (overlayOpen.get() === 1) {
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
