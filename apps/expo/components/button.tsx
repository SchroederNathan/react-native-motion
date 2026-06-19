import { Pressable, type PressableProps, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ButtonVariant = 'primary' | 'secondary';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  /** Text shown inside the button. */
  label: string;
  /** Filled accent (default) or a bordered, transparent button. */
  variant?: ButtonVariant;
}

/**
 * Reusable pill button. Filled with the theme `tint` by default, with a
 * spring press-scale matching the animation cards. Styling comes entirely
 * from `useTheme()`, so it adapts to whatever theme wraps it.
 */
export function Button({ label, variant = 'primary', disabled, ...props }: ButtonProps) {
  const { colors, theme, tokens } = useTheme();

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  const isPrimary = variant === 'primary';

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={(e) => {
        scale.set(withSpring(0.98));
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1));
        props.onPressOut?.(e);
      }}
      style={[
        animatedStyle,
        {
          height: 56,
          borderRadius: 28,
          alignItems: 'center',
          justifyContent: 'center',
          borderCurve: 'continuous',
          paddingHorizontal: tokens.spacing.xl,
          opacity: disabled ? 0.5 : 1,
          backgroundColor: isPrimary ? colors.tint : 'transparent',
          borderWidth: isPrimary ? 0 : 1,
          borderColor: colors.border,
          ...tokens.cardShadow,
        },
      ]}
    >
      <Text
        style={{
          color: isPrimary ? colors.background : colors.text,
          fontFamily: theme.fonts.semibold,
          fontSize: tokens.fontSize.body,
        }}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}
