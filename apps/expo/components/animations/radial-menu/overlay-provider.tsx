import {
  createContext,
  use,
  useCallback,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

// Timings measured frame-by-frame off the source recording: the wash ramps
// up, peaks mid-transition, and tails off — an ease-in-out over ~210ms in,
// ~170ms out.
const EASE_WASH = Easing.inOut(Easing.quad);
const OPEN_MS = 210;
const CLOSE_MS = 170;
const CARD_POP_SCALE = 1.03;

interface OverlayContextValue {
  showOverlay: (content: ReactNode) => void;
  /** `onClosed` fires once the close animation settles (used to reveal the card). */
  hideOverlay: (onClosed?: () => void) => void;
}

const OverlayContext = createContext<OverlayContextValue | null>(null);

export function useOverlay() {
  const ctx = use(OverlayContext);
  if (!ctx) throw new Error('useOverlay must be used within an OverlayProvider');
  return ctx;
}

/**
 * Owns the full-screen white wash and the lifted content layer that the
 * radial menu fans out from. Mount it once around any screen that uses the
 * long-press menu; `showOverlay` swaps in the cloned card + menu, `hideOverlay`
 * fades it all back out.
 */
export function OverlayProvider({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const [overlayContent, setOverlayContent] = useState<ReactNode>(null);

  const overlayOpacity = useSharedValue(0);
  const contentScale = useSharedValue(1);

  const finishHide = useCallback(() => {
    setIsVisible(false);
    setOverlayContent(null);
  }, []);

  const showOverlay = useCallback(
    (content: ReactNode) => {
      setOverlayContent(content);
      setIsVisible(true);
      overlayOpacity.set(withTiming(1, { duration: OPEN_MS, easing: EASE_WASH }));
      contentScale.set(
        withTiming(CARD_POP_SCALE, { duration: OPEN_MS, easing: EASE_WASH }),
      );
    },
    [contentScale, overlayOpacity],
  );

  const hideOverlay = useCallback(
    (onClosed?: () => void) => {
      contentScale.set(withTiming(1, { duration: CLOSE_MS, easing: EASE_WASH }));
      overlayOpacity.set(
        withTiming(0, { duration: CLOSE_MS, easing: EASE_WASH }, (finished) => {
          'worklet';
          if (finished) {
            scheduleOnRN(finishHide);
            if (onClosed) scheduleOnRN(onClosed);
          }
        }),
      );
    },
    [contentScale, finishHide, overlayOpacity],
  );

  const washStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.get(),
  }));

  // The lifted card stays fully opaque — only the white wash behind it fades,
  // and the card pops out a touch.
  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: contentScale.get() }],
  }));

  return (
    <OverlayContext value={{ showOverlay, hideOverlay }}>
      {children}
      {isVisible && (
        <>
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.wash, washStyle]}
            pointerEvents="none"
          />
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.content, contentStyle]}
            pointerEvents="box-none"
          >
            {overlayContent}
          </Animated.View>
        </>
      )}
    </OverlayContext>
  );
}

const styles = StyleSheet.create({
  wash: { zIndex: 9998, backgroundColor: 'rgba(255, 255, 255, 0.92)' },
  content: { zIndex: 9999 },
});
