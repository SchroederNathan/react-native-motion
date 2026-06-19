import { BlurView } from 'expo-blur';
import {
  createContext,
  use,
  useCallback,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

interface OverlayContextValue {
  showOverlay: (content: ReactNode) => void;
  /** `onClosed` fires once the close spring settles (used to reveal the card). */
  hideOverlay: (onClosed?: () => void) => void;
}

const OverlayContext = createContext<OverlayContextValue | null>(null);

export function useOverlay() {
  const ctx = use(OverlayContext);
  if (!ctx) throw new Error('useOverlay must be used within an OverlayProvider');
  return ctx;
}

/**
 * Owns the full-screen blur, dark scrim, and the lifted content layer that the
 * radial menu fans out from. Mount it once around any screen that uses the
 * long-press menu; `showOverlay` swaps in the cloned card + menu, `hideOverlay`
 * springs it all back out.
 */
export function OverlayProvider({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const [overlayContent, setOverlayContent] = useState<ReactNode>(null);

  const blurIntensity = useSharedValue(0);
  const overlayOpacity = useSharedValue(0);
  const contentScale = useSharedValue(1);
  const contentRotation = useSharedValue(0);

  const finishHide = useCallback(() => {
    setIsVisible(false);
    setOverlayContent(null);
  }, []);

  const showOverlay = useCallback(
    (content: ReactNode) => {
      setOverlayContent(content);
      setIsVisible(true);
      overlayOpacity.set(withSpring(1));
      blurIntensity.set(withSpring(80));
      contentScale.set(withSpring(1.1));
      // A tiny random tilt makes the lifted card feel physical.
      contentRotation.set(withSpring(Math.random() * 6 - 3));
    },
    [blurIntensity, contentRotation, contentScale, overlayOpacity],
  );

  const hideOverlay = useCallback(
    (onClosed?: () => void) => {
      blurIntensity.set(withSpring(0));
      contentScale.set(withSpring(1));
      contentRotation.set(withSpring(0));
      overlayOpacity.set(
        withSpring(0, undefined, (finished) => {
          'worklet';
          if (finished) {
            scheduleOnRN(finishHide);
            if (onClosed) scheduleOnRN(onClosed);
          }
        }),
      );
    },
    [blurIntensity, contentRotation, contentScale, finishHide, overlayOpacity],
  );

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.get(),
  }));

  // The lifted card stays fully opaque — it just scales and tilts. Only the
  // blur/scrim fades, so the clone never washes out.
  const contentStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: contentScale.get() },
      { rotate: `${contentRotation.get()}deg` },
    ],
  }));

  const blurAnimatedProps = useAnimatedProps(() => ({
    intensity: blurIntensity.get(),
  }));

  return (
    <OverlayContext value={{ showOverlay, hideOverlay }}>
      {children}
      {isVisible && (
        <>
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]}
            pointerEvents="none"
          >
            <AnimatedBlurView
              tint="dark"
              style={StyleSheet.absoluteFill}
              animatedProps={blurAnimatedProps}
            />
            <View style={[StyleSheet.absoluteFill, styles.scrim]} />
          </Animated.View>
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
  overlay: { zIndex: 9998 },
  content: { zIndex: 9999 },
  scrim: { backgroundColor: 'rgba(0,0,0,0.4)' },
});
