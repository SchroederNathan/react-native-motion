import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { RadialIconProps } from './icons';

export interface RadialActionDef {
  id: string;
  icon: (props: RadialIconProps) => React.ReactElement;
  title: string;
}

const BUTTON_RADIUS = 28;
const DEFAULT_RADIUS = 96;
const DEFAULT_ANGLE_STEP_DEG = 40;
const BUTTON_SIZE = BUTTON_RADIUS * 2;
const BASE_ICON_SIZE = 22;
// How much the button grows when the finger sits on it (1.0 → 1.4).
const PROXIMITY_GROW = 0.4;
const TITLE_MARGIN = 20;

// Reference timings, measured frame-by-frame off the source recording:
// open ~220ms wash + ~250ms button travel, close is a ~130ms fade in place,
// focus swaps in ~100ms. Entrances use a strong ease-out.
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
export const MENU_OPEN_MS = 250;
export const MENU_CLOSE_MS = 130;
const FOCUS_MS = 100;
const TITLE_MS = 120;

// Interpolate along the shortest angular path, so e.g. 0° → 310° sweeps
// -50° instead of the long way through +136°.
function lerpAngle(a: number, b: number, t: number) {
  'worklet';
  const delta = ((b - a + 540) % 360) - 180;
  return a + delta * t;
}

interface RadialButtonModel {
  id: string;
  icon: RadialActionDef['icon'];
  pos: { x: number; y: number };
}

function RadialButton({
  button,
  pressX,
  pressY,
  cursorX,
  cursorY,
  animationProgress,
  fade,
  hoveredId,
}: {
  button: RadialButtonModel;
  pressX: number;
  pressY: number;
  cursorX: SharedValue<number>;
  cursorY: SharedValue<number>;
  animationProgress: SharedValue<number>;
  fade: SharedValue<number>;
  hoveredId: SharedValue<string | null>;
}) {
  const Icon = button.icon;

  // 0 → idle (black glyph on white), 1 → focused (white glyph on black).
  const focus = useDerivedValue(() =>
    withTiming(hoveredId.get() === button.id ? 1 : 0, { duration: FOCUS_MS }),
  );

  // 1 → far from the finger, up to 1 + PROXIMITY_GROW with the finger on it.
  const proximityScale = useDerivedValue(() => {
    const dx = cursorX.get() - button.pos.x;
    const dy = cursorY.get() - button.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const closeness = Math.max(0, Math.min(1, 1 - dist / (BUTTON_RADIUS * 2)));
    return 1 + PROXIMITY_GROW * closeness;
  });

  // The glyph grows with proximity by RE-RENDERING at the live size — a font
  // glyph re-laid-out at each integer size stays vector-crisp, where a
  // transform would rasterize and blur it. Deliberate JS-bridge tradeoff:
  // it fires only on integer size changes while the finger is near.
  const [iconSize, setIconSize] = useState(BASE_ICON_SIZE);

  useAnimatedReaction(
    () => Math.round(BASE_ICON_SIZE * proximityScale.get()),
    (size, prev) => {
      if (size !== prev) scheduleOnRN(setIconSize, size);
    },
  );

  // The container spawns at the press point and travels its spoke while
  // growing; its scale ends at exactly 1 so the glyph rests at full
  // resolution. On close it fades in place (`fade`), it never travels back.
  const animatedButtonStyle = useAnimatedStyle(() => {
    const progress = animationProgress.get();

    return {
      opacity: progress * fade.get(),
      transform: [
        { translateX: (button.pos.x - pressX) * progress },
        { translateY: (button.pos.y - pressY) * progress },
        { scale: progress },
      ],
    };
  });

  // The discs grow by animating their real size (childless, absolutely
  // positioned, so the layout pass is trivial) — the circle re-renders crisp
  // at every size where a transform would blur its rasterized edge.
  const discBaseStyle = useAnimatedStyle(() => {
    const size = BUTTON_SIZE * proximityScale.get();
    const inset = (BUTTON_SIZE - size) / 2;
    return { width: size, height: size, left: inset, top: inset };
  });

  const discFocusedStyle = useAnimatedStyle(() => {
    const size = BUTTON_SIZE * proximityScale.get();
    const inset = (BUTTON_SIZE - size) / 2;
    return {
      opacity: focus.get(),
      width: size,
      height: size,
      left: inset,
      top: inset,
    };
  });

  const focusedIconStyle = useAnimatedStyle(() => ({
    opacity: focus.get(),
  }));

  const idleIconStyle = useAnimatedStyle(() => ({
    opacity: 1 - focus.get(),
  }));

  return (
    <Animated.View
      style={[
        styles.button,
        {
          left: pressX - BUTTON_SIZE / 2,
          top: pressY - BUTTON_SIZE / 2,
        },
        animatedButtonStyle,
      ]}
    >
      {/* Idle: black glyph on the white disc. Focused: the black disc and
          white glyph crossfade in on top. */}
      <Animated.View style={[styles.discBase, discBaseStyle]} />
      <Animated.View style={[styles.discFocused, discFocusedStyle]} />
      <Animated.View style={[styles.iconLayer, idleIconStyle]}>
        <Icon size={iconSize} color="#000000" />
      </Animated.View>
      <Animated.View style={[styles.iconLayer, focusedIconStyle]}>
        <Icon size={iconSize} color="#FFFFFF" />
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Names the focused action in large dark text, anchored to the screen edge
 * opposite the press. The text only updates when a new action is focused, so
 * it stays put while fading out.
 */
function HoveredTitle({
  hoveredId,
  titles,
  onLeft,
  y,
}: {
  hoveredId: SharedValue<string | null>;
  titles: Record<string, string>;
  onLeft: boolean;
  y: number;
}) {
  const [title, setTitle] = useState('');

  useAnimatedReaction(
    () => hoveredId.get(),
    (id, prev) => {
      if (id && id !== prev) scheduleOnRN(setTitle, titles[id] ?? '');
    },
  );

  const labelStyle = useAnimatedStyle(() => ({
    opacity: withTiming(hoveredId.get() !== null ? 1 : 0, {
      duration: TITLE_MS,
    }),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.titleWrap,
        onLeft ? { left: TITLE_MARGIN } : { right: TITLE_MARGIN },
        { top: y - 22 },
        labelStyle,
      ]}
    >
      <Animated.Text style={styles.titleText} numberOfLines={1}>
        {title}
      </Animated.Text>
    </Animated.View>
  );
}

export function RadialMenu({
  pressX,
  pressY,
  cursorX,
  cursorY,
  releaseSignal,
  progress,
  fade,
  actions,
  onSelect,
  onCancel,
  radius = DEFAULT_RADIUS,
  angleStepDeg = DEFAULT_ANGLE_STEP_DEG,
}: {
  pressX: number;
  pressY: number;
  cursorX: SharedValue<number>;
  cursorY: SharedValue<number>;
  releaseSignal: SharedValue<number>;
  /** Fan-out progress driven by the hook: 0 collapsed, 1 fully open. */
  progress: SharedValue<number>;
  /** Close fade driven by the hook: buttons fade out in place. */
  fade: SharedValue<number>;
  actions: RadialActionDef[];
  onSelect: (id: string) => void;
  onCancel: () => void;
  radius?: number;
  angleStepDeg?: number;
}) {
  const { width, height } = useWindowDimensions();
  const hoveredId = useSharedValue<string | null>(null);
  const lastHapticId = useSharedValue<string | null>(null);

  // Fan the buttons away from the nearest screen edge.
  const baseAngleDeg = useMemo(() => {
    const cx = width / 2;
    const isTopQuarter = pressY < height / 4;
    const isCenterBand = Math.abs(pressX - cx) < width * 0.1;

    const centerAngle = isTopQuarter ? 180 : 0;
    const leftFar = isTopQuarter ? 230 : 310;
    const rightFar = isTopQuarter ? 120 : 60;
    const dxNorm = Math.min(1, Math.abs(pressX - cx) / (width / 2));

    let userAngle = centerAngle;
    if (!isCenterBand) {
      userAngle =
        pressX < cx
          ? lerpAngle(centerAngle, leftFar, dxNorm)
          : lerpAngle(centerAngle, rightFar, dxNorm);
    }

    return (270 - userAngle + 360) % 360;
  }, [height, pressX, pressY, width]);

  const buttons = useMemo<RadialButtonModel[]>(() => {
    const half = (actions.length - 1) / 2;
    return actions.map((action, i) => {
      const deg = baseAngleDeg + (i - half) * angleStepDeg;
      const rad = (deg * Math.PI) / 180;
      return {
        id: action.id,
        icon: action.icon,
        pos: {
          x: pressX + radius * Math.cos(rad),
          y: pressY + radius * Math.sin(rad),
        },
      };
    });
  }, [actions, angleStepDeg, baseAngleDeg, pressX, pressY, radius]);

  const buttonCenters = useMemo(
    () => buttons.map((b) => ({ id: b.id, x: b.pos.x, y: b.pos.y })),
    [buttons],
  );

  const titles = useMemo(
    () => Object.fromEntries(actions.map((a) => [a.id, a.title])),
    [actions],
  );

  // Track the nearest button under the finger; buzz once on each new hover.
  useAnimatedReaction(
    () => ({ x: cursorX.get(), y: cursorY.get() }),
    (pos) => {
      let nearestId: string | null = null;
      let nearestDist2 = Infinity;
      const threshold2 = (BUTTON_RADIUS * 3) ** 2;

      for (let i = 0; i < buttonCenters.length; i++) {
        const b = buttonCenters[i];
        const dx = pos.x - b.x;
        const dy = pos.y - b.y;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < nearestDist2) {
          nearestDist2 = dist2;
          nearestId = b.id;
        }
      }

      const active = nearestId && nearestDist2 <= threshold2 ? nearestId : null;

      if (hoveredId.get() !== active) {
        hoveredId.set(active);
        if (active && lastHapticId.get() !== active) {
          lastHapticId.set(active);
          scheduleOnRN(Haptics.selectionAsync);
        } else if (!active) {
          lastHapticId.set(null);
        }
      }
    },
  );

  // On release, select the hovered action or cancel. The hook fades the menu
  // out via `fade`. The signal is reset to 0 on open and only ever
  // incremented, so a non-zero first-run value is a release that landed while
  // this menu was still mounting — it must fire, not be skipped.
  useAnimatedReaction(
    () => releaseSignal.get(),
    (value, previous) => {
      if (value === 0 || value === previous) return;
      const hovered = hoveredId.get();
      if (hovered) {
        scheduleOnRN(Haptics.selectionAsync);
        scheduleOnRN(onSelect, hovered);
      } else {
        scheduleOnRN(onCancel);
      }
    },
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {buttons.map((button) => (
        <RadialButton
          key={button.id}
          button={button}
          pressX={pressX}
          pressY={pressY}
          cursorX={cursorX}
          cursorY={cursorY}
          animationProgress={progress}
          fade={fade}
          hoveredId={hoveredId}
        />
      ))}
      <HoveredTitle
        hoveredId={hoveredId}
        titles={titles}
        onLeft={pressX > width / 2}
        y={pressY}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discBase: {
    position: 'absolute',
    // Comfortably over half the largest size, so it clamps to a circle at
    // every animated width/height.
    borderRadius: BUTTON_SIZE * 2,
    backgroundColor: 'white',
    boxShadow: '0px 4px 12px -2px rgba(0, 0, 0, 0.25)',
  },
  discFocused: {
    position: 'absolute',
    borderRadius: BUTTON_SIZE * 2,
    backgroundColor: '#000000',
  },
  iconLayer: { position: 'absolute' },
  titleWrap: {
    position: 'absolute',
    maxWidth: 260,
  },
  titleText: {
    color: '#111111',
    fontSize: 32,
    fontWeight: '700',
  },
});
