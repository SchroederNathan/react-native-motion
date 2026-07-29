import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { Animation } from '@/data/animations';
import { useTheme } from '@/theme';

interface VideoCardProps {
  animation: Animation;
  /** The card most in view; only the active card plays. */
  isActive: boolean;
}

export function VideoCard({ animation, isActive }: VideoCardProps) {
  const { colors, tokens, theme } = useTheme();

  const hasVideo = animation.video != null;

  const player = useVideoPlayer(animation.video ?? null, (p) => {
    p.loop = true;
    p.muted = true;
  });

  // Fade the preview in once the first frame is ready (mirrors the website).
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const isReady = status === 'readyToPlay';
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(isReady ? 1 : 0, { duration: 400 });
  }, [isReady, opacity]);
  const videoStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  useEffect(() => {
    if (!hasVideo) return;
    if (isActive) player.play();
    else player.pause();
  }, [hasVideo, isActive, player]);

  return (
    <Animated.View entering={FadeIn.duration(400)} style={{ gap: tokens.spacing.md }}>
      {/* Shadow wrapper kept separate so the drop shadow isn't clipped. */}
      <View
        style={{
          borderRadius: tokens.radius.card,
          borderCurve: 'continuous',
          ...tokens.cardShadow,
        }}
      >
        <View
          style={{
            aspectRatio: 1,
            borderRadius: tokens.radius.card,
            borderCurve: 'continuous',
            overflow: 'hidden',
            backgroundColor: colors.border,
          }}
        >
          {hasVideo ? (
            <Animated.View style={[StyleSheet.absoluteFill, videoStyle]}>
              <VideoView
                player={player}
                style={StyleSheet.absoluteFill}
                nativeControls={false}
                contentFit="cover"
              />
            </Animated.View>
          ) : (
            /* Demo is built but not recorded yet — hold the square so the list
               layout is identical once the .mp4 lands. */
            <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontFamily: theme.fonts.medium,
                  fontSize: tokens.fontSize.caption,
                }}
              >
                Preview coming soon
              </Text>
            </View>
          )}
          {/* Subtle inset hairline on top of the media. */}
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { borderRadius: tokens.radius.card, borderCurve: 'continuous' },
              tokens.imageOutline,
            ]}
          />
        </View>
      </View>

      <View style={{ gap: tokens.spacing.xs }}>
        <Text
          selectable
          style={{
            color: colors.text,
            fontFamily: theme.fonts.semibold,
            fontSize: tokens.fontSize.title,
          }}
        >
          {animation.title}
        </Text>
        <Text
          selectable
          style={{
            color: colors.textSecondary,
            fontFamily: theme.fonts.regular,
            fontSize: tokens.fontSize.body,
            lineHeight: 22,
          }}
        >
          {animation.description}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  placeholder: { alignItems: 'center', justifyContent: 'center' },
});
