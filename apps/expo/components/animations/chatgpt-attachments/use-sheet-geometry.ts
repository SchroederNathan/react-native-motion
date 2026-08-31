import { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  useKeyboardHandler,
  useReanimatedKeyboardAnimation,
} from 'react-native-keyboard-controller';
import { useAnimatedStyle, useDerivedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { COMPOSER, GUTTER, sheetTopFromComposerBottom } from './constants';

/**
 * Where everything on this screen sits, derived from the one thing that moves
 * it: the keyboard. The composer rides the keyboard live on the UI thread,
 * while the sheet's React layout takes the keyboard's settled height — it only
 * matters once the keyboard has stopped moving.
 */
export function useSheetGeometry() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const keyboard = useReanimatedKeyboardAnimation();
  const [settledKeyboard, setSettledKeyboard] = useState(0);

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

  // The grid is laid out in React, so it needs the settled keyboard height as
  // a plain number.
  useKeyboardHandler(
    {
      onEnd: (event) => {
        'worklet';
        scheduleOnRN(setSettledKeyboard, event.height);
      },
    },
    [],
  );

  const settledBottom = height - Math.max(settledKeyboard, insets.bottom) - COMPOSER.keyboardGap;
  const panelTop = sheetTopFromComposerBottom(settledBottom);
  // The sheet keeps the composer's gutter rather than going full bleed, the way
  // the reference does — so the grid is laid out that much narrower. It also
  // stops a gutter short of the bottom of the screen, so the grid laid out
  // inside it has to as well — see the panel's `rect`.
  const gridWidth = width - GUTTER * 2;
  const gridHeight = height - panelTop - GUTTER;

  return { width, height, composerBottom, composerStyle, gridWidth, gridHeight };
}
