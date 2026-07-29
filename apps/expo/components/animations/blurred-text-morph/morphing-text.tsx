import { Manrope_600SemiBold } from '@expo-google-fonts/manrope';
import {
  BlurMask,
  Canvas,
  Group,
  Text as SkiaText,
  useFont,
  type DataSourceParam,
  type SkFont,
} from '@shopify/react-native-skia';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import {
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

/**
 * A character-diffing text morph rendered through Skia so each glyph can carry a
 * real Gaussian blur. When `text` changes, characters shared with the previous
 * string persist (same key -> same glyph) and glide to their new position, while
 * removed characters animate out (up + right, shrink, blur, fade) and added
 * characters animate in (rise from below, grow, sharpen, fade) — each staggered.
 *
 * Skia needs the font *file*, not a registered family name, so the source is a
 * required asset module. `@expo-google-fonts/*` packages already export exactly
 * that, which is why no font file has to be bundled.
 *
 * Every glyph is a retargetable state machine rather than a one-shot animation.
 * That is what makes rapid text changes safe: a glyph caught mid-exit that
 * reappears is redirected back in, instead of being stranded at opacity 0.
 */

const STAGGER_MS = 25; // per-character delay
const ENTER_DELAY_MS = 120; // lead so exiting letters clear before new ones arrive
const ENTER_RISE = 14; // px the incoming char rises from (below its target)
const EXIT_UP = 12; // px the outgoing char translates up
const EXIT_RIGHT = 8; // px the outgoing char translates right
const SHRINK = 0.7; // scale a char starts/ends at while entering/exiting
const BLUR_MAX = 6; // Gaussian blur (px) at the start of enter / end of exit
const MOVE_DURATION = 260;
const EXIT_DURATION = 240;
const GLIDE_DELAY_MS = 140; // persistent chars wait before sliding to their new spot
const GLIDE_DURATION = 320;

/**
 * Fraction of the font size from the baseline to the visual centre of a
 * lowercase-plus-caps line. Used to centre glyphs vertically and to scale them
 * around their middle rather than around the baseline origin.
 */
const CENTER_RATIO = 0.34;

// Key each character by value + running occurrence count, so the n-th "a" keeps
// a stable identity across a swap and reconciles to the same glyph.
function toKeyedChars(text: string): { char: string; key: string }[] {
  const counts: Record<string, number> = {};
  return [...text].map((char) => {
    const n = counts[char] ?? 0;
    counts[char] = n + 1;
    return { char, key: `${char}#${n}` };
  });
}

interface Cell {
  key: string;
  char: string;
  /** Absolute left edge within the canvas. */
  x: number;
  width: number;
  /** Position in the string, used for the stagger. */
  index: number;
  phase: 'present' | 'exit';
}

interface CharGlyphProps {
  /** Identity of this glyph, reported back when its exit finishes. */
  cellKey: string;
  char: string;
  x: number;
  glyphWidth: number;
  charIndex: number;
  isExiting: boolean;
  font: SkFont;
  color: string;
  fontSize: number;
  baselineY: number;
  staggerMs: number;
  blurMax: number;
  onExited: (key: string) => void;
}

/**
 * Props are primitives rather than a `cell` object, so `memo` can actually bail
 * out. A glyph whose position, order and phase are unchanged does no React work
 * when a *different* glyph in the string changes.
 */
const CharGlyph = memo(function CharGlyph({
  cellKey,
  char,
  x,
  glyphWidth,
  charIndex,
  isExiting,
  font,
  color,
  fontSize,
  baselineY,
  staggerMs,
  blurMax,
  onExited,
}: CharGlyphProps) {
  // Four shared values, of which only three are ever animated:
  //   gx     — layout position, animated on its own so a glide can run while the
  //            glyph is entering or leaving
  //   motion — spring, drives translate + scale
  //   fade   — timing, drives opacity + blur
  //   dir    — +1 entering, -1 leaving. Set, never animated, so it costs nothing
  //            to step; it only flips the sign of the offsets below.
  const gx = useSharedValue(x);
  const motion = useSharedValue(0);
  const fade = useSharedValue(0);
  const dir = useSharedValue(1);

  // Glide: slide (after a short wait) to a new layout position.
  const isFirstLayout = useRef(true);
  useEffect(() => {
    if (isFirstLayout.current) {
      isFirstLayout.current = false;
      return;
    }
    gx.set(withDelay(GLIDE_DELAY_MS, withTiming(x, { duration: GLIDE_DURATION })));
  }, [x]);

  // The whole in/out state machine, driven only by an actual phase flip, which
  // retargets the same shared values instead of starting a parallel animation —
  // so an interrupted glyph always ends up consistent with its current phase.
  //
  // The guard matters for cost, not just correctness: a surviving glyph's
  // `charIndex` changes on almost every swap (letters move), and without it that
  // would restart the enter animation of every persisting glyph to the value it
  // already holds. Those glyphs should only run their glide.
  const appliedPhase = useRef<'present' | 'exit' | null>(null);
  useEffect(() => {
    const phase = isExiting ? 'exit' : 'present';
    if (appliedPhase.current === phase) return;
    appliedPhase.current = phase;

    if (!isExiting) {
      dir.set(1);
      const delay = ENTER_DELAY_MS + charIndex * staggerMs;
      motion.set(withDelay(delay, withSpring(1)));
      fade.set(withDelay(delay, withTiming(1, { duration: MOVE_DURATION })));
      return;
    }

    dir.set(-1);
    const delay = charIndex * staggerMs;
    motion.set(withDelay(delay, withTiming(0, { duration: EXIT_DURATION })));
    fade.set(
      withDelay(
        delay,
        // Removal rides the animation's own completion instead of a setTimeout.
        // A timer would keep firing after the glyph came back and would delete a
        // visible letter; this cannot, and it drops one timer per glyph.
        withTiming(0, { duration: EXIT_DURATION }, (finished) => {
          if (finished) scheduleOnRN(onExited, cellKey);
        }),
      ),
    );
  }, [isExiting, charIndex, staggerMs, cellKey, onExited]);

  const transform = useDerivedValue(() => {
    const settled = motion.get();
    const away = 1 - settled;
    const leaving = dir.get() < 0;
    return [
      { translateX: gx.get() + (leaving ? EXIT_RIGHT * away : 0) },
      { translateY: baselineY + (leaving ? -EXIT_UP : ENTER_RISE) * away },
      { scale: SHRINK + (1 - SHRINK) * settled },
    ];
  });

  const blur = useDerivedValue(() => blurMax * (1 - fade.get()));

  // Scale around the glyph's centre rather than the baseline origin.
  const origin = useMemo(
    () => ({ x: glyphWidth / 2, y: -fontSize * CENTER_RATIO }),
    [glyphWidth, fontSize],
  );

  return (
    <Group transform={transform} origin={origin} opacity={fade}>
      <SkiaText x={0} y={0} text={char} font={font} color={color} />
      <BlurMask blur={blur} style="normal" />
    </Group>
  );
});

export interface MorphingTextProps {
  /** The string to display. Changing it triggers the morph. */
  text: string;
  /** Canvas width. The string is centred inside it. */
  width: number;
  /** Canvas height. The string is centred vertically. */
  height: number;
  /** Glyph color. */
  color: string;
  /**
   * Glyph size in points, treated as a *maximum*. If any string in `fitTexts`
   * would overflow `width`, every string is drawn at a reduced size instead.
   * @default 32
   */
  fontSize?: number;
  /**
   * Font *file* for Skia — a required asset module, not a family name.
   * @default Manrope_600SemiBold
   */
  fontSource?: DataSourceParam;
  /** Family name used only by the pre-load fallback `<Text>`. */
  fallbackFontFamily?: string;
  /**
   * Every string this canvas will ever show. The size is fitted to the widest of
   * them once, so the type does not resize as the text changes.
   * @default [text]
   */
  fitTexts?: readonly string[];
  /** Per-character delay. @default 25 */
  staggerMs?: number;
  /** Peak Gaussian blur in px. @default 6 */
  blurMax?: number;
}

export function MorphingText({
  text,
  width,
  height,
  color,
  fontSize = 32,
  fontSource = Manrope_600SemiBold,
  fallbackFontFamily,
  fitTexts,
  staggerMs = STAGGER_MS,
  blurMax = BLUR_MAX,
}: MorphingTextProps) {
  // Measure at the requested size, then shrink to fit the widest string. Two
  // font instances is the cost of an exact fit — a per-character heuristic would
  // either clip a wide string or leave a narrow one too small.
  const probeFont = useFont(fontSource, fontSize);
  const fittedSize = useMemo(() => {
    if (!probeFont) return fontSize;
    const candidates = fitTexts?.length ? fitTexts : [text];
    const widest = candidates.reduce((max, candidate) => {
      const advances = probeFont.getGlyphWidths(probeFont.getGlyphIDs(candidate));
      return Math.max(max, advances.reduce((sum, w) => sum + w, 0));
    }, 0);
    if (widest <= width || widest === 0) return fontSize;
    return Math.floor(fontSize * (width / widest));
  }, [probeFont, fitTexts, text, width, fontSize]);

  const font = useFont(fontSource, fittedSize);
  const baselineY = height / 2 + fittedSize * CENTER_RATIO;

  const [cells, setCells] = useState<Cell[]>([]);

  useEffect(() => {
    if (!font) return;

    const keyed = toKeyedChars(text);
    // Use true glyph advance widths (not tight bounds) so spacing/positioning
    // is accurate — tight bounds drop trailing spaces and side bearings.
    const advances = font.getGlyphWidths(font.getGlyphIDs(text));
    const total = advances.reduce((sum, w) => sum + w, 0);
    // Centre the string within the canvas.
    let cursor = (width - total) / 2;

    const nextByKey = new Map<string, Cell>();
    keyed.forEach((k, index) => {
      const w = advances[index] ?? 0;
      nextByKey.set(k.key, {
        key: k.key,
        char: k.char,
        x: cursor,
        width: w,
        index,
        phase: 'present',
      });
      cursor += w;
    });

    // Reconciling the previous glyph set against the new text is a stateful
    // transition (persist / enter / exit animations keyed off the prior set),
    // not a pure render derivation — so state is set from the effect by design.
    setCells((previous) => {
      const merged: Cell[] = [...nextByKey.values()];
      for (const old of previous) {
        if (nextByKey.has(old.key)) continue;
        // Already leaving: keep the *same object* so `memo` bails out and its
        // exit animation is never restarted. Carrying these forward is what
        // lets a glyph finish leaving across several rapid text changes.
        merged.push(old.phase === 'exit' ? old : { ...old, phase: 'exit' });
      }
      return merged;
    });
  }, [text, font, width]);

  const removeCell = useCallback((key: string) => {
    setCells((previous) => {
      const cell = previous.find((c) => c.key === key);
      // The glyph may have re-entered while its exit was finishing. Dropping it
      // then would delete a letter that is currently visible.
      if (!cell || cell.phase !== 'exit') return previous;
      return previous.filter((c) => c.key !== key);
    });
  }, []);

  // Until the Skia font loads, fall back to plain text so the copy still shows.
  if (!font) {
    return (
      <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
        <Text
          numberOfLines={1}
          style={{ color, fontSize: fittedSize, fontFamily: fallbackFontFamily }}
        >
          {text}
        </Text>
      </View>
    );
  }

  return (
    <Canvas style={{ width, height }}>
      {cells.map((cell) => (
        <CharGlyph
          key={cell.key}
          cellKey={cell.key}
          char={cell.char}
          x={cell.x}
          glyphWidth={cell.width}
          charIndex={cell.index}
          isExiting={cell.phase === 'exit'}
          font={font}
          color={color}
          fontSize={fittedSize}
          baselineY={baselineY}
          staggerMs={staggerMs}
          blurMax={blurMax}
          onExited={removeCell}
        />
      ))}
    </Canvas>
  );
}
