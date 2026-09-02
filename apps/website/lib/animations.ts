import fs from 'fs'
import path from 'path'

export interface AnimationMeta {
  title: string
  slug: string
  description: string
  video: string
  tags?: string[]
}

export function getAllAnimationSlugs(): string[] {
  const contentDir = path.join(process.cwd(), 'content', 'animations')
  return fs.readdirSync(contentDir).filter((name) =>
    fs.statSync(path.join(contentDir, name)).isDirectory()
  )
}

const GITHUB_REPO_URL = 'https://github.com/SchroederNathan/react-native-motion'

// Animation folders that exist in the public repo under
// apps/expo/components/animations. Slugs without a folder there
// (currently linear-tab-bar) link to the repo root instead.
const GITHUB_ANIMATION_DIRS = new Set([
  'aurora-curtain',
  'blurred-text-morph',
  'chatgpt-attachments',
  'gallery-carousel',
  'radial-menu',
  'spring-toast',
])

export function getAnimationGitHubUrl(slug: string): string {
  return GITHUB_ANIMATION_DIRS.has(slug)
    ? `${GITHUB_REPO_URL}/tree/main/apps/expo/components/animations/${slug}`
    : GITHUB_REPO_URL
}

export async function getAnimationMeta(slug: string): Promise<AnimationMeta> {
  const mod = await import(`@/content/animations/${slug}/page.mdx`)
  return mod.meta
}

export async function getAllAnimationMetas(): Promise<AnimationMeta[]> {
  const slugs = getAllAnimationSlugs()
  return Promise.all(slugs.map(getAnimationMeta))
}
