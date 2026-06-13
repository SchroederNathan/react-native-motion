# React Native Motion website

The landing page and docs for [React Native Motion](../../README.md). Each animation gets a page with a preview, a link to its source on GitHub, and a QR code that opens the same animation in the [React Native Motion app](../expo).

## Stack

- [Next.js 16](https://nextjs.org) (App Router)
- [Tailwind CSS 4](https://tailwindcss.com)
- MDX for animation pages — each animation lives in `content/animations/<slug>/` with a `page.mdx` (the docs page) and an `llm.md` (agent-readable version, surfaced via `llms.txt`)
- [Motion](https://motion.dev) and [react-three-fiber](https://docs.pmnd.rs/react-three-fiber) for the landing page

## Running it

From the repo root:

```bash
bun install
bun website       # dev server at http://localhost:3000
```

Or from this directory:

```bash
bun dev
bun run build     # production build
bun start         # serve the production build
bun lint          # ESLint
```

## Adding an animation page

1. Create `content/animations/<slug>/page.mdx` and `llm.md`.
2. The page should link to the animation's source in `apps/expo` on GitHub and render the QR code that deep links to `react-native-motion://` for that animation.
