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

export async function getAnimationMeta(slug: string): Promise<AnimationMeta> {
  const mod = await import(`@/content/animations/${slug}/page.mdx`)
  return mod.meta
}

export async function getAllAnimationMetas(): Promise<AnimationMeta[]> {
  const slugs = getAllAnimationSlugs()
  return Promise.all(slugs.map(getAnimationMeta))
}
