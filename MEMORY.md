# Project Environment

- Bun workspace monorepo with an Expo/React Native app in `apps/expo` and a Next.js site in `apps/website`.
- Mobile app: Expo SDK 56, React Native 0.85, Expo Router, Reanimated 4.3; iOS and Android native projects are configured.
- Start Metro from the repository root with `bun expo` (default port 8081).
- Run iOS with `bun run --filter expo-app ios`; run Android with `bun run --filter expo-app android`.
- Mobile identifiers: `com.schroedernathan.rnmotion` on iOS and Android.
- Use Bun for workspace commands. There is no configured mobile test runner; validate with TypeScript and device QA.
- Before Expo edits, follow `apps/expo/AGENTS.md` and consult the exact Expo SDK 56 documentation.
