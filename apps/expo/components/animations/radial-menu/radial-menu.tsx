import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
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
const BASE_ICON_SIZE = 22;

function lerpAngle(a: number, b: number, t: number) {
  'worklet';
  return a + (b - a) * t;
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
  hoveredId,
}: {
  button: RadialButtonModel;
  pressX: number;
  pressY: number;
  cursorX: SharedValue<number>;
  cursorY: SharedValue<number>;
  animationProgress: SharedValue<number>;
  hoveredId: SharedValue<string | null>;
}) {
  const [iconSize, setIconSize] = useState(BASE_ICON_SIZE);
  const Icon = button.icon;

  // 1 → far from finger, up to 1.4 → finger sitting on the button.
  const proximityScale = useDerivedValue(() => {
    const dx = cursorX.get() - button.pos.x;
    const dy = cursorY.get() - button.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const normalized = Math.max(0, Math.min(1, 1 - dist / (BUTTON_RADIUS * 2)));
    return 1 + normalized * 0.4;
  });

  // Bridge the proximity scale into React state so the glyph grows with it.
  useAnimatedReaction(
    () => Math.round(proximityScale.get() * BASE_ICON_SIZE),
    (size, prev) => {
      if (size !== prev) scheduleOnRN(setIconSize, size);
    },
  );

  const animatedButtonStyle = useAnimatedStyle(() => {
    const progress = animationProgress.get();

    const startX = pressX - BUTTON_RADIUS;
    const startY = pressY - BUTTON_RADIUS;
    const endX = button.pos.x - BUTTON_RADIUS;
    const endY = button.pos.y - BUTTON_RADIUS;

    const currentX = startX + (endX - startX) * progress;
    const currentY = startY + (endY - startY) * progress;

    const proximity = proximityScale.get();

    // Nudge the button along its spoke, away from the finger, when close.
    const vx = endX - startX;
    const vy = endY - startY;
    const vlen = Math.max(1, Math.sqrt(vx * vx + vy * vy));
    const closeness = Math.max(0, Math.min(1, (proximity - 1) / 0.4));
    const offset = 32 * closeness * closeness * progress;

    const size = BUTTON_RADIUS * 2 * progress * proximity;

    return {
      left: currentX + (vx / vlen) * offset,
      top: currentY + (vy / vlen) * offset,
      opacity: progress,
      width: size,
      height: size,
      borderRadius: size / 2,
    };
  });

  const activeIconStyle = useAnimatedStyle(() => ({
    opacity: hoveredId.get() === button.id ? 1 : 0,
  }));

  const inactiveIconStyle = useAnimatedStyle(() => ({
    opacity: hoveredId.get() === button.id ? 0 : 1,
  }));

  return (
    <Animated.View style={[styles.button, animatedButtonStyle]}>
      <Animated.View style={[styles.iconLayer, activeIconStyle]}>
        <Icon size={iconSize} color="#000000" />
      </Animated.View>
      <Animated.View style={[styles.iconLayer, inactiveIconStyle]}>
        <Icon size={iconSize} color="#FFFFFF" />
      </Animated.View>
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

  // On release, select the hovered action or cancel. The hook collapses the
  // fan-out via `progress`.
  useAnimatedReaction(
    () => releaseSignal.get(),
    (value, previous) => {
      if (previous == null || value === previous) return;
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
          hoveredId={hoveredId}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    boxShadow: '0px 6px 16px -4px rgba(0, 0, 0, 0.45)',
  },
  iconLayer: { position: 'absolute' },
});
