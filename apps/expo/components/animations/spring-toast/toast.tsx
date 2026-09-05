import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { useTheme } from '@/theme';
import { taupe } from '@/theme/palette';

/** Screen edge a toast enters from, rests against, and dismisses toward. */
export type ToastPosition = 'top' | 'bottom';

export interface ToastConfig {
  id: number;
  message: string;
  position: ToastPosition;
  actionText?: string;
  onActionPress?: () => void;
}

/** Travel distance of the entrance — far enough to clear the screen edge. */
const ENTER_OFFSET = 200;
const HIDDEN_SCALE = 0.7;
const AUTO_DISMISS_MS = 3000;
const FADE_IN_MS = 200;
const EXIT_MS = 160;
/** How far the front toast slides toward its edge while fading out on close/timeout. */
const EXIT_DROP = 40;
/** Extra travel a swipe-dismissed toast keeps after the finger lets go. */
const SWIPE_EXIT_DROP = 80;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
/** A drag toward the edge past this distance, or a flick past this velocity, commits. */
const DISMISS_DISTANCE = 56;
const DISMISS_VELOCITY = 800;

/**
 * Stack layout: each toast behind the front peeks out and shrinks a step. The
 * peek is measured from the front toast's far edge (top edge for a bottom
 * stack, bottom edge for a top stack), so one- to three-line toasts still
 * step out evenly.
 */
const STACK_PEEK = 14;
const STACK_SCALE_STEP = 0.05;
const MAX_VISIBLE = 3;

/** Dragging away from the edge resists toward an asymptote instead of following the finger. */
function rubberBand(distance: number) {
  'worklet';
  return (40 * distance) / (distance + 120);
}

/**
 * Vertical offset that puts a toast's far edge STACK_PEEK per slot beyond the
 * front toast's far edge, for a stack anchored to the bottom of the screen.
 * Every toast is anchored to the same edge and scales about its own center, so
 * the offset depends on both heights. A top stack is the mirror image, so it
 * uses the negated value.
 */
function stackOffset(index: number, height: number, frontHeight: number) {
  const scale = 1 - index * STACK_SCALE_STEP;
  return -frontHeight + (height * (1 + scale)) / 2 - index * STACK_PEEK;
}

export function Toast({
  toast,
  index,
  height,
  frontHeight,
  onHeightChange,
  onDismissStart,
  onDismissed,
}: {
  toast: ToastConfig;
  /** Position from the front of the stack: 0 = newest, on top. */
  index: number;
  /** Measured layout height of this toast; undefined until the first layout. */
  height?: number;
  /** Measured height of the front toast, the baseline the stack peeks beyond. */
  frontHeight?: number;
  onHeightChange: (id: number, height: number) => void;
  onDismissStart: (id: number) => void;
  onDismissed: (id: number) => void;
}) {
  const { colors, scheme, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  // Every vertical motion (entrance, stack peek, drag, exit drop) points
  // toward the anchored edge: +1 is down for a bottom toast, -1 is up for a
  // top toast. Flipping this one sign mirrors the whole animation.
  const dir = toast.position === 'top' ? -1 : 1;

  // 0 = hidden past the edge, 1 = resting. Entrance only — the exit is a
  // slide-out fade, not this spring in reverse.
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);
  const dragY = useSharedValue(0);
  // Where the stack wants this toast: springs when the index or the heights
  // shift. New toasts always enter at the front, where the offset is 0.
  const stackY = useSharedValue(0);
  const stackScale = useSharedValue(1 - index * STACK_SCALE_STEP);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitingRef = useRef(false);
  // The auto-dismiss timer closes over an old render; read the index live.
  const indexRef = useRef(index);
  indexRef.current = index;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const finishDismiss = useCallback(
    () => onDismissed(toast.id),
    [onDismissed, toast.id],
  );

  const dismiss = useCallback(
    (kind: 'timeout' | 'close' | 'swipe') => {
      if (exitingRef.current) return;
      exitingRef.current = true;
      clearTimer();
      // Promote the toasts behind right away, not after the fade.
      onDismissStart(toast.id);

      opacity.set(
        withTiming(0, { duration: EXIT_MS }, (finished) => {
          if (finished) scheduleOnRN(finishDismiss);
        }),
      );
      if (reduced) return;
      if (kind === 'swipe') {
        dragY.set(
          withTiming(dragY.get() + dir * SWIPE_EXIT_DROP, {
            duration: EXIT_MS,
            easing: EASE_OUT,
          }),
        );
      } else if (indexRef.current === 0) {
        dragY.set(
          withTiming(dir * EXIT_DROP, { duration: EXIT_MS, easing: EASE_OUT }),
        );
      }
      // A toast expiring behind the front just fades where it sits.
    },
    [clearTimer, dir, dragY, finishDismiss, onDismissStart, opacity, reduced, toast.id],
  );

  const restartTimer = useCallback(() => {
    if (exitingRef.current) return;
    clearTimer();
    timerRef.current = setTimeout(() => dismiss('timeout'), AUTO_DISMISS_MS);
  }, [clearTimer, dismiss]);

  const commitSwipeDismiss = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    dismiss('swipe');
  }, [dismiss]);

  // Animate in once on mount; each toast is its own entry in the stack.
  useEffect(() => {
    progress.set(reduced ? 1 : withSpring(1));
    opacity.set(withTiming(1, { duration: FADE_IN_MS }));
    restartTimer();
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow the stack as newer toasts arrive or front ones leave. Heights come
  // from layout, so the offset waits until this toast and the front one are
  // both measured; a toast in front with a different height moves the rest.
  useEffect(() => {
    if (exitingRef.current) return;
    const scale = 1 - index * STACK_SCALE_STEP;
    stackScale.set(reduced ? scale : withSpring(scale));
    if (height !== undefined && frontHeight !== undefined) {
      const y = dir * stackOffset(index, height, frontHeight);
      stackY.set(reduced ? y : withSpring(y));
    }
    // Deep entries fade away instead of poking out of the far side of the stack.
    if (index >= MAX_VISIBLE) {
      opacity.set(withTiming(0, { duration: FADE_IN_MS }));
    }
  }, [dir, frontHeight, height, index, opacity, reduced, stackScale, stackY]);

  const pan = Gesture.Pan()
    // Only the front toast is under the finger; the rest are decoration.
    .enabled(index === 0)
    .onBegin(() => {
      // A held toast shouldn't vanish under the finger.
      scheduleOnRN(clearTimer);
    })
    .onUpdate((e) => {
      // Measured toward the edge: positive follows the finger, negative resists.
      const toward = e.translationY * dir;
      dragY.set(dir * (toward >= 0 ? toward : -rubberBand(-toward)));
    })
    .onEnd((e) => {
      if (
        e.translationY * dir > DISMISS_DISTANCE ||
        e.velocityY * dir > DISMISS_VELOCITY
      ) {
        scheduleOnRN(commitSwipeDismiss);
      } else {
        dragY.set(withSpring(0));
        scheduleOnRN(restartTimer);
      }
    })
    .onFinalize((_e, success) => {
      if (!success) scheduleOnRN(restartTimer);
    });

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: opacity.get(),
      transform: [
        {
          translateY:
            (1 - p) * ENTER_OFFSET * dir + stackY.get() + dragY.get(),
        },
        { scale: (HIDDEN_SCALE + (1 - HIDDEN_SCALE) * p) * stackScale.get() },
      ],
    };
  });

  const handleAction = () => {
    toast.onActionPress?.();
    dismiss('close');
  };

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        onLayout={(e) => onHeightChange(toast.id, e.nativeEvent.layout.height)}
        style={[
          styles.container,
          toast.position === 'top'
            ? { top: insets.top + 16 }
            : { bottom: insets.bottom + 16 },
          {
            backgroundColor: colors.text,
            borderColor: scheme === 'dark' ? '#FFFFFF' : taupe[900],
          },
          animatedStyle,
        ]}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="checkmark" size={20} color={colors.background} />
          </View>
          <Text
            style={[
              styles.message,
              { color: colors.background, fontFamily: theme.fonts.semibold },
            ]}
            numberOfLines={3}
          >
            {toast.message}
          </Text>
          {toast.actionText && toast.onActionPress && (
            <Pressable
              onPress={handleAction}
              hitSlop={8}
              style={styles.actionButton}
            >
              <Text
                style={[
                  styles.actionText,
                  {
                    color: colors.background,
                    fontFamily: theme.fonts.semibold,
                  },
                ]}
              >
                {toast.actionText}
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => dismiss('close')}
            hitSlop={8}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={18} color={colors.background} />
          </Pressable>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    zIndex: 100,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.25)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  iconContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  actionText: {
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  closeButton: {
    padding: 4,
  },
});
