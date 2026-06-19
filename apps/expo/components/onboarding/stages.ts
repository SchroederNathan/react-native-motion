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
    id: 'welcome',
    title: 'A gallery of React Native animations',
    lottie: require('@/assets/lottie/welcome.json'),
  },
  {
    id: 'search',
    title: 'Search by name or tag',
    lottie: require('@/assets/lottie/search.json'),
  },
  {
    id: 'autoplay',
    title: 'The preview in view plays itself',
    lottie: require('@/assets/lottie/autoplay.json'),
  },
  {
    id: 'themes',
    title: 'Every demo themed to match',
    lottie: require('@/assets/lottie/themes.json'),
  },
  {
    id: 'get-started',
    title: 'Tap any animation to start',
    lottie: require('@/assets/lottie/get-started.json'),
  },
];
