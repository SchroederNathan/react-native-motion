import type { LottieViewProps } from 'lottie-react-native';

/**
 * A single onboarding stage. The flow renders one full-screen page per entry —
 * progress dots, paging, and the Next / Get Started button all derive from this
 * array, so **adding a stage is a one-line change here** and nothing else.
 */
export interface OnboardingStage {
  /** Stable key for the list. */
  id: string;
  /** The primary line for this segment, revealed character-by-character. */
  title: string;
  /** Lottie animation shown above the text. Replace the placeholders in assets/lottie/. */
  lottie: LottieViewProps['source'];
}

export const stages: OnboardingStage[] = [
  {
    id: 'gallery',
    title: 'A gallery of React Native animations',
    lottie: require('@/assets/lottie/gallery.json'),
  },
  {
    id: 'source',
    title: 'Grab the code, build it into your app',
    lottie: require('@/assets/lottie/source.json'),
  },
  {
    id: 'agent-ready',
    title: 'Or let your agent build it for you',
    lottie: require('@/assets/lottie/agent-ready.json'),
  },
];
