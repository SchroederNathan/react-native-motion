import type { MetadataRoute } from 'next'
import { getAllAnimationSlugs } from '@/lib/animations'

export default function sitemap(): MetadataRoute.Sitemap {
  const slugs = getAllAnimationSlugs()

  const animationPages = slugs.map((slug) => ({
    url: `https://rnmotion.dev/animations/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  return [
    {
      url: 'https://rnmotion.dev',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...animationPages,
  ]
}
