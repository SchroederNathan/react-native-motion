import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardController } from 'react-native-keyboard-controller';
import {
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { DURATION, EASE_FADE, EASE_OUT, SPRING } from './constants';
import type { MenuAction } from './panel/attachment-menu';

export type Mode = 'closed' | 'menu' | 'photos' | 'camera';

/**
 * What the panel turns into once it stops being the menu. Kept apart from
 * `mode`, because it has to outlive it: on the way back to the menu the sheet
 * is still crossfading out, and swapping its contents mid-fade would flash the
 * other sheet through it.
 */
export type Sheet = 'photos' | 'camera';

interface PanelOptions {
  /**
   * Called whenever the panel walks away from a sheet — a dismiss, or the ‹
   * back to the menu — so the screen can drop the sheet's selection with it.
   */
  onLeaveSheet?: () => void;
}

/**
 * The panel's state machine: closed ⇄ menu ⇄ one of the sheets. It owns every
 * shared value the panel morphs on and every way in and out of it — except the
 * attach-and-leave close, which belongs to the flights (see
 * `useAttachmentFlights`) and drives the panel through `collapseForLeave` /
 * `resetAfterLeave`.
 */
export function useAttachmentPanel({ onLeaveSheet }: PanelOptions = {}) {
  const [mode, setMode] = useState<Mode>('closed');
  const [sheet, setSheet] = useState<Sheet>('photos');
  /**
   * True for the length of a close, whichever way it was asked for. The sheet
   * is still mounted and still collapsing, but its material is already on its
   * way out — see the screen's `glass` prop.
   */
  const [closing, setClosing] = useState(false);
  /** Pending panel mount, held back while the + gets out of the way. */
  const leadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = useSharedValue(0);
  /**
   * 0 the + is in place → 1 it has cleared the space the panel opens on. Its
   * own value rather than a read of `open`, because it deliberately runs out of
   * step with the panel: it leads on the way in and trails on the way out.
   */
  const plusOut = useSharedValue(0);
  const morph = useSharedValue(0);
  const menuOpacity = useSharedValue(1);
  const gridOpacity = useSharedValue(0);
  const blur = useSharedValue(0);

  // Drops a lead-in still in flight if the screen goes away mid-open.
  useEffect(
    () => () => {
      if (leadTimer.current !== null) clearTimeout(leadTimer.current);
    },
    [],
  );

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
    //
    // The flights' `attach` value is deliberately not reset here: every settle
    // puts it back to 0 (see `useAttachmentFlights`), and nothing else moves
    // it, so it is already there by the time the menu can open again.
    plusOut.set(withSpring(1, SPRING.panel));
    morph.set(0);
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
  }, [blur, clearLead, gridOpacity, menuOpacity, morph, open, plusOut]);

  const dismiss = useCallback(() => {
    clearLead();
    onLeaveSheet?.();
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
  }, [blur, clearLead, closeSheet, gridOpacity, menuOpacity, morph, onLeaveSheet, open, plusOut]);

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
    onLeaveSheet?.();
    pulseBlur();
    morph.set(withSpring(0, SPRING.panel));
    menuOpacity.set(withTiming(1, { duration: DURATION.crossfade, easing: EASE_FADE }));
    gridOpacity.set(withTiming(0, { duration: DURATION.crossfade, easing: EASE_FADE }));
  }, [gridOpacity, menuOpacity, morph, onLeaveSheet, pulseBlur]);

  const onMenuAction = useCallback(
    (action: MenuAction) => {
      // Photos and Camera have somewhere to go in this demo; the rest close.
      if (action === 'photos') showSheet('photos');
      else if (action === 'camera') showSheet('camera');
      else dismiss();
    },
    [dismiss, showSheet],
  );

  const onPlusPress = useCallback(() => {
    // A lead-in is in flight for its whole length while `mode` is still shut,
    // so the ref is what says whether this tap is opening or closing.
    if (mode === 'closed' && leadTimer.current === null) openMenu();
    else dismiss();
  }, [dismiss, mode, openMenu]);

  /**
   * The panel's half of an attach-and-leave: the sheet leaves the way any
   * close leaves it — back into the + button, on the spring with the bounce
   * taken out. It is not carrying the photos any more (they fly on their own,
   * see `useAttachmentFlights`), so it has no reason to go anywhere else.
   * No completion callback here: the flight is what decides when it is over.
   */
  const collapseForLeave = useCallback(() => {
    setClosing(true);
    blur.set(withTiming(1, { duration: DURATION.panel, easing: EASE_FADE }));
    gridOpacity.set(withTiming(0, { duration: DURATION.crossfade, easing: EASE_FADE }));
    morph.set(withSpring(0, SPRING.panelOut));
    open.set(withSpring(0, SPRING.panelOut));
    plusOut.set(withDelay(DURATION.plusLead, withSpring(0, SPRING.panelOut)));
  }, [blur, gridOpacity, morph, open, plusOut]);

  /**
   * The panel's half of the flight landing. Everything the panel drove is
   * reset outright — it is unmounted by now, so there is nothing left to see
   * it move. `plusOut` is deliberately untouched: the + came back on its own
   * spring while the photos flew, and it is on screen.
   */
  const resetAfterLeave = useCallback(() => {
    closeSheet();
    open.set(0);
    morph.set(0);
    gridOpacity.set(0);
    menuOpacity.set(1);
    blur.set(0);
  }, [blur, closeSheet, gridOpacity, menuOpacity, morph, open]);

  return {
    mode,
    sheet,
    closing,
    open,
    plusOut,
    morph,
    menuOpacity,
    gridOpacity,
    blur,
    onPlusPress,
    dismiss,
    backToMenu,
    onMenuAction,
    collapseForLeave,
    resetAfterLeave,
  };
}
