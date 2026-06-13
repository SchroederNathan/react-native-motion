# React Native Motion

Beautiful animations for React Native and Expo. Built for you or your agent to ship.

Every animation lives in this repo and is demoed in two places:

- **The React Native Motion app** (`apps/expo`) — browse and search every animation from the home screen. The demo most in view autoplays on a loop, and tapping it opens the full animation screen.
- **The website** (`apps/website`) — docs and previews for each animation, with links to the source on GitHub and QR codes that open the same animation directly in the React Native Motion app.

## Monorepo

Bun workspaces:

| Path | Description |
| --- | --- |
| `apps/expo` | The React Native Motion app (Expo SDK 56, expo-router, Reanimated 4) |
| `apps/website` | Landing page and docs (Next.js 16, Tailwind CSS 4, MDX) |

## Getting Started

```bash
bun install

# Run the website at http://localhost:3000
bun website

# Run the Expo app
bun expo
```

The Expo app uses a dev client (`expo-dev-client`), so you'll need a development build — see [Expo's docs](https://docs.expo.dev/develop/development-builds/introduction/) or build one with `bun run --filter expo-app ios` / `android`.

## Scripts

| Command | Description |
| --- | --- |
| `bun website` | Start the Next.js dev server |
| `bun expo` | Start the Expo dev server |
| `bun run --filter website build` | Build the website for production |
| `bun run --filter website lint` | Lint the website |
