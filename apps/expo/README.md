# React Native Motion app

The demo app for [React Native Motion](../../README.md). Every animation in the repo runs here, natively.

- The home screen indexes all animations and is searchable.
- The demo most in view autoplays on a loop.
- Tapping a demo navigates to that animation's full screen.
- The [website](../website) renders QR codes that deep link into these screens via the `react-native-motion://` scheme.

## Stack

- [Expo SDK 56](https://docs.expo.dev/versions/v56.0.0/) with [expo-router](https://docs.expo.dev/router/introduction/)
- [Reanimated 4](https://docs.swmansion.com/react-native-reanimated/) + react-native-worklets
- expo-dev-client — the app runs in a development build, not Expo Go

## Running it

From the repo root:

```bash
bun install
bun expo          # start the dev server
```

Or from this directory:

```bash
bun start         # expo start
bun ios           # build & run on iOS
bun android       # build & run on Android
```

## EAS builds

| Profile | Use |
| --- | --- |
| `development` | Internal dev client build for devices |
| `development-simulator` | Dev client build for the iOS simulator (no credentials needed) |
| `preview` | Internal distribution |
| `production` | Store builds, auto-incremented |

```bash
eas build --profile development-simulator --platform ios
```

Updates ship over the air with `expo-updates`, with one channel per build profile.
