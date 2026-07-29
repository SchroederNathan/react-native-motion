import { defineTheme } from '@/theme';

/**
 * Co-located theme. Deliberately inherits the core palette unchanged: the demo's
 * only control is a `Button`, and it should read exactly like the app's other
 * primary buttons (the onboarding "Continue"), which take `colors.tint` from the
 * core theme. Overriding the tint with an accent would make this one pill an
 * odd colour out.
 */
export const blurredTextMorphTheme = defineTheme({
  name: 'blurred-text-morph',
});
