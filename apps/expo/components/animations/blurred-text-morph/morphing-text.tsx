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
const CLEANUP_GRACE_MS = 40; // small buffer before an exited cell is dropped

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
  cell: Cell;
  font: SkFont;
  color: string;
  fontSize: number;
  baselineY: number;
  staggerMs: number;
  blurMax: number;
  onExited: (key: string) => void;
}

// Memoized so removing one exited glyph (a setCells that keeps every other
// cell's reference) doesn't re-render the whole string — only cells whose props
// actually changed (e.g. a new x on a text swap, which drives the glide) rerun.
const CharGlyph = memo(function CharGlyph({
  cell,
  font,
  color,
  fontSize,
  baselineY,
  staggerMs,
  blurMax,
  onExited,
}: CharGlyphProps) {
  // gx = glide X (animates between layout positions); tx/ty = enter/exit offset.
  const gx = useSharedValue(cell.x);
  const tx = useSharedValue(0);
  const ty = useSharedValue(ENTER_RISE);
  const sc = useSharedValue(SHRINK);
  const op = useSharedValue(0);
  const bl = useSharedValue(blurMax);

  // Enter: on mount, cascade from below/blurred/faded/small into place.
  useEffect(() => {
    const delay = ENTER_DELAY_MS + cell.index * staggerMs;
    ty.set(withDelay(delay, withSpring(0)));
    sc.set(withDelay(delay, withSpring(1)));
    op.set(withDelay(delay, withTiming(1, { duration: MOVE_DURATION })));
    bl.set(withDelay(delay, withTiming(0, { duration: MOVE_DURATION })));
  }, []);

  // Glide: persistent characters slide (after a short wait) to their new x.
  const isFirstLayout = useRef(true);
  useEffect(() => {
    if (isFirstLayout.current) {
      isFirstLayout.current = false;
      return;
    }
    gx.set(
      withDelay(GLIDE_DELAY_MS, withTiming(cell.x, { duration: GLIDE_DURATION })),
    );
  }, [cell.x]);

  // Exit: continue up + right, shrink, blur and fade, then drop the cell.
  useEffect(() => {
    if (cell.phase !== 'exit') return;
    const delay = cell.index * staggerMs;
    ty.set(withDelay(delay, withTiming(-EXIT_UP, { duration: EXIT_DURATION })));
    tx.set(withDelay(delay, withTiming(EXIT_RIGHT, { duration: EXIT_DURATION })));
    sc.set(withDelay(delay, withTiming(SHRINK, { duration: EXIT_DURATION })));
    bl.set(withDelay(delay, withTiming(blurMax, { duration: EXIT_DURATION })));
    op.set(withDelay(delay, withTiming(0, { duration: EXIT_DURATION })));

    const timer = setTimeout(
      () => onExited(cell.key),
      delay + EXIT_DURATION + CLEANUP_GRACE_MS,
    );
    return () => clearTimeout(timer);
  }, [cell.phase]);

  const transform = useDerivedValue(() => [
    { translateX: gx.get() + tx.get() },
    { translateY: baselineY + ty.get() },
    { scale: sc.get() },
  ]);

  // Scale around the glyph's centre rather than the baseline origin.
  const origin = { x: cell.width / 2, y: -fontSize * CENTER_RATIO };

  return (
    <Group transform={transform} origin={origin} opacity={op}>
      <SkiaText x={0} y={0} text={cell.char} font={font} color={color} />
      <BlurMask blur={bl} style="normal" />
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
   * Every string this canvas will ever show. The size is fitted to the widest of
   * them once, so the type does not resize as the text changes.
   * @default [text]
   */
  fitTexts?: readonly string[];
  /**
   * Font *file* for Skia — a required asset module, not a family name.
   * @default Manrope_600SemiBold
   */
  fontSource?: DataSourceParam;
  /** Family name used only by the pre-load fallback `<Text>`. */
  fallbackFontFamily?: string;
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

  const seenRef = useRef<Map<string, Cell>>(new Map());
  const [cells, setCells] = useState<Cell[]>([]);

  useEffect(() => {
    if (!font) return;

    const keyed = toKeyedChars(text);
    // Use true glyph advance widths (not tight bounds) so spacing/positioning
    // is accurate — tight bounds drop trailing spaces and side bearings.
    const advances = font.getGlyphWidths(font.getGlyphIDs(text));
    const total = advances.reduce((sum, w) => sum + w, 0);
    // Centre the string within the canvas.
    const originX = (width - total) / 2;

    let cursor = originX;
    const present: Cell[] = keyed.map((k, index) => {
      const w = advances[index] ?? 0;
      const cell: Cell = {
        key: k.key,
        char: k.char,
        x: cursor,
        width: w,
        index,
        phase: 'present',
      };
      cursor += w;
      return cell;
    });

    const presentKeys = new Set(present.map((c) => c.key));
    const exiting: Cell[] = [];
    seenRef.current.forEach((cell, key) => {
      if (!presentKeys.has(key)) exiting.push({ ...cell, phase: 'exit' });
    });

    const nextSeen = new Map<string, Cell>();
    present.forEach((c) => nextSeen.set(c.key, c));
    seenRef.current = nextSeen;

    // Reconciling the previous glyph set against the new text is a stateful
    // transition (persist / enter / exit animations keyed off the prior set),
    // not a pure render derivation — so state is set from the effect by design.
    setCells([...present, ...exiting]);
  }, [text, font, width]);

  const removeCell = useCallback(
    (key: string) => setCells((prev) => prev.filter((c) => c.key !== key)),
    [],
  );

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
          cell={cell}
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
