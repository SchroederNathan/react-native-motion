import { Icon } from '@/components/icon';
import { Image } from 'expo-image';
import { forwardRef, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type TextInput as TextInputType,
} from 'react-native';
import Animated, {
  FadeOut,
  LinearTransition,
  useAnimatedReaction,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { COLORS, COMPOSER, COMPOSER_STRIP_HEIGHT, DURATION, GUTTER } from './constants';
import { Glass } from './glass';
import type { LibraryPhoto } from './use-photo-library';

interface ThumbnailProps {
  photo: LibraryPhoto;
  /** Held back while the panel is still flying into this slot. */
  hidden: boolean;
  onRemove: (id: string) => void;
}

function Thumbnail({ photo, hidden, onRemove }: ThumbnailProps) {
  return (
    // No entering animation: the panel is still standing in for this slot, and
    // the hand-off has to be a straight swap or the photo double-exposes.
    // Leaving is the opposite — the thumbnail fades where it stands while the
    // ones after it close the gap, which is what `layout` is for.
    <Animated.View
      exiting={FadeOut.duration(DURATION.crossfade)}
      layout={LinearTransition.duration(DURATION.attach)}
      style={[styles.thumb, hidden && styles.thumbHidden]}
    >
      <Image
        source={photo.id}
        recyclingKey={photo.id}
        contentFit="cover"
        cachePolicy="memory-disk"
        style={StyleSheet.absoluteFill}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Remove attachment"
        hitSlop={10}
        onPress={() => onRemove(photo.id)}
        style={styles.remove}
      >
        <Icon name="close" size={11} color={COLORS.text} />
      </Pressable>
    </Animated.View>
  );
}

export interface ComposerProps {
  attachments: LibraryPhoto[];
  /**
   * 0 no strip → 1 strip fully open. Owned by the screen rather than by this
   * component: the panel flying in from the photo grid aims at a slot inside
   * the strip, and that slot is still opening while it flies.
   */
  strip: SharedValue<number>;
  /** Id of the attachment the flying panel is still standing in for. */
  pendingId: string | null;
  onPlusPress: () => void;
  onRemove: (id: string) => void;
  onFocus?: () => void;
}

/**
 * The ChatGPT composer. Its bottom edge is fixed — adding attachments grows it
 * upwards, which is what keeps the + button (and therefore the menu's anchor)
 * from moving. Removing the last one collapses it back down the same way.
 *
 * The bar and the send button are both real glass on iOS 26. The bar is the
 * container and the button is the control, so only the button is interactive —
 * the surface under the text field has no business bulging while it is typed
 * into. Neither clips: the button's rim and its press bulge are drawn outside
 * its bounds, and an `overflow: hidden` on the bar would cut them off.
 */
export const Composer = forwardRef<TextInputType, ComposerProps>(function Composer(
  { attachments, strip, pendingId, onPlusPress, onRemove, onFocus },
  ref,
) {
  const hasAttachments = attachments.length > 0;

  /**
   * The strip has to outlive its last attachment. `attachments` empties on the
   * tap, but the strip spends the next third of a second closing, and an empty
   * strip has nothing left in it to shrink away.
   */
  const [retained, setRetained] = useState(attachments);
  useEffect(() => {
    if (hasAttachments) setRetained(attachments);
  }, [attachments, hasAttachments]);

  // Dropped once the strip is shut, not before: a spring lands exactly on its
  // target, so `=== 0` is the moment it is safe to unmount the photos.
  useAnimatedReaction(
    () => strip.get() === 0,
    (shut, wasShut) => {
      if (shut && wasShut === false) scheduleOnRN(setRetained, [] as LibraryPhoto[]);
    },
  );

  /**
   * The strip's own height, clipped. Its contents keep their full size and are
   * anchored to its top, so the photos rise out of the text row as it opens and
   * slide back down into it as it closes rather than squashing.
   */
  const stripStyle = useAnimatedStyle(() => ({
    height: strip.get() * COMPOSER_STRIP_HEIGHT,
  }));

  return (
    <Glass
      radius={COMPOSER.radius}
      interactive={false}
      // Below iOS 26 the bar keeps the flat surface it was measured at.
      fallbackTint={COLORS.surface}
      style={styles.root}
    >
      <Animated.View style={[styles.strip, stripStyle]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          style={styles.stripScroll}
          contentContainerStyle={styles.stripContent}
        >
          {retained.map((photo) => (
            <Thumbnail
              key={photo.id}
              photo={photo}
              hidden={photo.id === pendingId}
              onRemove={onRemove}
            />
          ))}
        </ScrollView>
      </Animated.View>

      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add attachment"
          hitSlop={12}
          onPress={onPlusPress}
          style={styles.plus}
        >
          <Icon name="plus" size={COMPOSER.plusSize} color={COLORS.text} />
        </Pressable>

        <TextInput
          ref={ref}
          placeholder="Ask ChatGPT"
          placeholderTextColor={COLORS.placeholder}
          // The reference is a dark-mode app throughout, and it shows: the
          // keyboard is what the sheet's material is sampling for most of its
          // height, so a light keyboard turns the whole sheet light grey.
          keyboardAppearance="dark"
          onFocus={onFocus}
          multiline={false}
          style={styles.field}
        />

        <Pressable accessibilityRole="button" accessibilityLabel="Dictate" hitSlop={10}>
          <Icon name="mic" size={COMPOSER.micSize} color={COLORS.text} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hasAttachments ? 'Send' : 'Voice mode'}
          style={styles.action}
        >
          <Icon
            name={hasAttachments ? 'arrow-up' : 'audio-lines'}
            size={18}
            color={COLORS.background}
          />
        </Pressable>
      </View>
    </Glass>
  );
});

const styles = StyleSheet.create({
  root: {
    marginHorizontal: GUTTER,
  },
  strip: {
    // The clip the bar used to carry. It lives here instead so no glass sits
    // under an `overflow: hidden`; the radius is the bar's own, pulled in by
    // the strip's inset so the two curves stay concentric. It is also what
    // makes the height animate: the photos are cut off by it, never scaled.
    overflow: 'hidden',
    borderTopLeftRadius: COMPOSER.radius - COMPOSER.stripPaddingTop,
    borderTopRightRadius: COMPOSER.radius - COMPOSER.stripPaddingTop,
    borderCurve: 'continuous',
  },
  stripScroll: {
    // Pinned to the top of the clip at its full open height, so a half-open
    // strip shows the top of the photos rather than a squashed copy of them.
    position: 'absolute',
    left: 0,
    right: 0,
    top: COMPOSER.stripPaddingTop,
    height: COMPOSER.thumbSize,
  },
  stripContent: {
    paddingLeft: COMPOSER.stripPaddingTop,
    gap: COMPOSER.thumbGap,
  },
  thumb: {
    width: COMPOSER.thumbSize,
    height: COMPOSER.thumbSize,
    borderRadius: COMPOSER.thumbRadius,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: '#141414',
  },
  thumbHidden: {
    opacity: 0,
  },
  row: {
    height: COMPOSER.rowHeight,
    flexDirection: 'row',
    alignItems: 'center',
    // Shared with the panel: these two put the + glyph's centre at
    // `PLUS_CENTER_X`, which is where the menu grows out of.
    paddingLeft: COMPOSER.rowPaddingLeft,
    paddingRight: 9,
    gap: 10,
  },
  plus: {
    width: COMPOSER.plusHit,
    alignItems: 'center',
  },
  field: {
    flex: 1,
    color: COLORS.text,
    fontSize: COMPOSER.fieldSize,
    padding: 0,
  },
  remove: {
    position: 'absolute',
    top: COMPOSER.removeBadgeInset,
    right: COMPOSER.removeBadgeInset,
    width: COMPOSER.removeBadge,
    height: COMPOSER.removeBadge,
    borderRadius: COMPOSER.removeBadge / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  action: {
    // Solid white, not glass: it is the one control in the bar that has to read
    // as the primary action, and a material takes its contrast from whatever it
    // happens to be sitting over.
    width: COMPOSER.actionSize,
    height: COMPOSER.actionSize,
    borderRadius: COMPOSER.actionSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.text,
  },
});
