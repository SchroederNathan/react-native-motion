import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  type SharedValue,
} from 'react-native-reanimated';
import {
  COMPOSER,
  COMPOSER_STRIP_HEIGHT,
  GRID,
  GUTTER,
  MENU,
  MENU_HEIGHT,
  PLUS_CENTER_X,
} from './constants';
import { PanelMaterial } from './glass';
import type { LibraryPhoto } from './use-photo-library';

function mix(t: number, a: number, b: number) {
  'worklet';
  return a + (b - a) * t;
}

export interface PanelDrivers {
  /** 0 the circle around the + button → 1 the menu at rest. */
  open: SharedValue<number>;
  /** 0 menu-shaped → 1 full-bleed grid. */
  morph: SharedValue<number>;
  /** 0 in place → 1 landed on its slot in the composer. */
  attach: SharedValue<number>;
  /** Opacity of the menu rows. */
  menuOpacity: SharedValue<number>;
  /** Opacity of the photo grid. */
  gridOpacity: SharedValue<number>;
  /** Opacity of the single photo shown while flying into the composer. */
  flyOpacity: SharedValue<number>;
  /** Opacity of the blur laid over the whole panel mid-transition. */
  blur: SharedValue<number>;
  /**
   * 0 no attachment strip → 1 strip fully open. The composer grows around the
   * strip on its own spring, so the slot this panel is flying into is still
   * rising while it flies; reading it live is what lands the photo on it
   * instead of near it.
   */
  strip: SharedValue<number>;
  /** Window Y of the composer's bottom edge, tracked live off the keyboard. */
  composerBottom: SharedValue<number>;
}

interface AttachmentPanelProps extends PanelDrivers {
  screenWidth: number;
  screenHeight: number;
  /**
   * Width the grid is laid out at — the panel's own width once morphed. The
   * sheet keeps the composer's gutter rather than going full bleed, so this is
   * narrower than the screen and the grid runs edge to edge inside it.
   */
  gridWidth: number;
  /** Height the grid is laid out at — the panel's own height once morphed. */
  gridHeight: number;
  /**
   * Which layer takes touches. Both layers stay mounted through the morph, and
   * a faded-out view still swallows taps — without this the menu intercepts
   * every tap meant for the grid underneath it.
   */
  interactive: 'menu' | 'grid' | 'none';
  /** Index of the composer slot the panel flies into. */
  attachSlot: number;
  /**
   * The photo the panel will carry into the composer. Handed over as soon as
   * it is selected, not when the flight starts: a fresh `ph://` image takes a
   * frame or four to come back from the photo library even when it is already
   * cached, and paying that during the flight leaves the panel empty.
   */
  flying: LibraryPhoto | null;
  /** True only while the panel is flying into the composer. */
  isFlying: boolean;
  /** Whether the panel is wearing the menu's frosted material. */
  glass: boolean;
  /** How long the glass takes to come or go, in seconds. */
  glassDuration: number;
  menu: ReactNode;
  grid: ReactNode;
}

/**
 * The one surface behind the whole interaction. It is the menu, then the photo
 * grid, then the thumbnail landing in the composer — never three views handing
 * off to each other, which is why the corners and the material stay continuous
 * the way they do in the reference.
 *
 * Its contents are laid out at their own natural size and scaled to fit the
 * panel, so the grid shrinks into the menu's footprint (and the menu blows up
 * out of it) exactly as the recording shows.
 */
export function AttachmentPanel({
  screenWidth,
  screenHeight,
  gridWidth,
  gridHeight,
  interactive,
  attachSlot,
  flying,
  isFlying,
  glass,
  glassDuration,
  menu,
  grid,
  open,
  morph,
  attach,
  menuOpacity,
  gridOpacity,
  flyOpacity,
  blur,
  strip,
  composerBottom,
}: AttachmentPanelProps) {
  /**
   * The panel's frame, in window coordinates. Menu and grid share a top edge —
   * that isn't a simplification, it's what the frames measure — so the morph
   * only has to move the left, right and bottom edges.
   */
  const rect = useDerivedValue(() => {
    const bottom = composerBottom.get();
    const plusCenter = bottom - COMPOSER.rowHeight / 2;
    const top = plusCenter + MENU.centerOffset - MENU_HEIGHT / 2;

    // Left edge never moves: menu and sheet share the composer's gutter. So
    // does the bottom edge once the sheet is open — it stops a gutter short of
    // the screen rather than running off it, so the inset reads the same on
    // three sides and the sheet's bottom corners are visible.
    const m = morph.get();
    let x = GUTTER;
    let y = top;
    let w = mix(m, MENU.width, gridWidth);
    let h = mix(m, MENU_HEIGHT, screenHeight - top - GUTTER);
    let r = mix(m, MENU.radius, GRID.panelRadius);

    // The panel begins as the circle wrapping the + button and grows out of it,
    // then collapses back into it on the way out. Nothing else ever draws that
    // circle, so there is none to see while the sheet is shut.
    const o = open.get();
    const well = COMPOSER.plusWell;
    x = mix(o, PLUS_CENTER_X - well / 2, x);
    y = mix(o, plusCenter - well / 2, y);
    w = mix(o, well, w);
    h = mix(o, well, h);
    r = mix(o, well / 2, r);

    const a = attach.get();
    if (a > 0) {
      const composerTop =
        bottom - COMPOSER.rowHeight - strip.get() * COMPOSER_STRIP_HEIGHT;
      const step = COMPOSER.thumbSize + COMPOSER.thumbGap;
      const lastVisible = screenWidth - GUTTER - COMPOSER.stripPaddingTop - COMPOSER.thumbSize;
      const slotX = Math.min(
        GUTTER + COMPOSER.stripPaddingTop + attachSlot * step,
        lastVisible,
      );
      x = mix(a, x, slotX);
      y = mix(a, y, composerTop + COMPOSER.stripPaddingTop);
      w = mix(a, w, COMPOSER.thumbSize);
      h = mix(a, h, COMPOSER.thumbSize);
      r = mix(a, r, COMPOSER.thumbRadius);
    }

    return { x, y, w, h, r };
  });

  /**
   * The panel's own opacity is never animated: it carries the glass, and glass
   * put under an animated opacity renders nothing. Every layer inside carries
   * this fade instead, and the material has its own native transition.
   *
   * The ramp starts a beat late so the circle reads as a circle before the rows
   * arrive, and is short once it does. In the reference the menu is gone within
   * four frames of the tap while the panel is still easing shut, and the same
   * curve read backwards is what makes it arrive faint.
   */
  const openFade = useDerivedValue(() =>
    interpolate(open.get(), [0.12, 0.6], [0, 1], Extrapolation.CLAMP),
  );

  const panelStyle = useAnimatedStyle(() => {
    const { x, y, w, h } = rect.get();
    return { left: x, top: y, width: w, height: h };
  });

  /** The panel's live corner radius, worn by the material and by the clip. */
  const shapeStyle = useAnimatedStyle(() => ({ borderRadius: rect.get().r }));

  // Both wrappers carry their content's real size. A zero-sized wrapper would
  // still paint, but iOS drops touches that land outside a view's bounds.
  const menuStyle = useAnimatedStyle(() => ({
    opacity: menuOpacity.get() * openFade.get(),
    transform: [{ scale: rect.get().w / MENU.width }],
  }));

  const gridStyle = useAnimatedStyle(() => ({
    opacity: gridOpacity.get() * openFade.get(),
    transform: [{ scale: rect.get().w / gridWidth }],
  }));

  const flyStyle = useAnimatedStyle(() => ({ opacity: flyOpacity.get() * openFade.get() }));
  // Capped below 1: the tint that comes with a dark blur would otherwise read
  // as the panel dimming rather than softening.
  const blurStyle = useAnimatedStyle(() => ({ opacity: blur.get() * 0.85 * openFade.get() }));

  return (
    <Animated.View pointerEvents="box-none" style={[styles.panel, panelStyle]}>
      {/* The panel's material, on its own and never wrapped in an animated
          opacity. It rounds itself off `shapeStyle` rather than being clipped
          by the panel — an interactive glass surface draws the bulge it makes
          under a press outside its own bounds, and a clip eats it.

          It is the menu's surface and then the grid's: it stays on through the
          morph, so the photos sit on the same material the rows did and it
          shows through the gutter and the gaps between cells. Only the flight
          drops it, and only because by then nothing of it is visible and
          re-rendering a material on every frame of a resize is what turns a
          300ms move into three steps. */}
      {isFlying ? null : (
        <PanelMaterial
          variant={glass ? 'regular' : 'none'}
          duration={glassDuration}
          style={[StyleSheet.absoluteFill, shapeStyle]}
        />
      )}

      {/* Everything that has to be cut to the panel's shape, and nothing else.
          The clip lives here rather than on the panel so no glass sits under
          an `overflow: hidden`. */}
      <Animated.View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, styles.clip, shapeStyle]}
      >
        <Animated.View
          pointerEvents={interactive === 'grid' ? 'auto' : 'none'}
          style={[styles.content, { width: gridWidth, height: gridHeight }, gridStyle]}
        >
          {grid}
        </Animated.View>

        <Animated.View
          pointerEvents={interactive === 'menu' ? 'auto' : 'none'}
          style={[styles.content, { width: MENU.width, height: MENU_HEIGHT }, menuStyle]}
        >
          {menu}
        </Animated.View>

        {flying ? (
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, flyStyle]}>
            <Image
              source={flying.id}
              recyclingKey={flying.id}
              contentFit="cover"
              cachePolicy="memory-disk"
              priority="high"
              transition={0}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        ) : null}

        {/* Everything inside the panel softens while it is moving and sharpens
            as it settles — the reference blurs on every one of these changes. */}
        {isFlying ? null : (
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, blurStyle]}>
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          </Animated.View>
        )}
      </Animated.View>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
  },
  clip: {
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  content: {
    position: 'absolute',
    left: 0,
    top: 0,
    transformOrigin: 'top left',
  },
});
