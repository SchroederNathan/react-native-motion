import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import { resolve } from "path";

const rehypeCodeMeta = resolve(import.meta.dirname, "lib/rehype-code-meta.mjs");

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "mdx", "ts", "tsx"],
  turbopack: {
    // The stray lockfile in the home directory makes Next.js infer the wrong
    // workspace root, which breaks module resolution in dev.
    root: resolve(import.meta.dirname, "../.."),
  },
};

const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-gfm"],
    rehypePlugins: ["@mapbox/rehype-prism", rehypeCodeMeta],
  },
});

export default withMDX(nextConfig);
