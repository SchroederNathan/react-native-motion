import { getAllAnimationSlugs } from '@/lib/animations'
import { VideoDemo } from '@/components/elements/video-demo'
import type { Metadata } from 'next'

export default async function AnimationPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { default: Content, meta } = await import(
    `@/content/animations/${slug}/page.mdx`
  )

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 lg:items-center mb-12">
        <div className="lg:w-1/2 lg:shrink-0">
          <VideoDemo src={meta.video} className="my-0" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-4xl/10 tracking-tight font-medium text-taupe-950 dark:text-taupe-50 mb-3 text-wrap-balance">
            {meta.title}
          </h1>
          <p className="text-base/7 text-taupe-700 dark:text-taupe-300 text-wrap-pretty">
            {meta.description}
          </p>
          {meta.tags && (
            <div className="flex flex-wrap gap-2 mt-4">
              {meta.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-lg bg-taupe-950/5 dark:bg-taupe-50/5 px-2.5 py-1 text-xs font-medium text-taupe-600 dark:text-taupe-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div>
        <Content />
      </div>
    </>
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const { meta } = await import(`@/content/animations/${slug}/page.mdx`)
  return {
    title: `${meta.title} - React Native Motion`,
    description: meta.description,
  }
}

export function generateStaticParams() {
  return getAllAnimationSlugs().map((slug) => ({ slug }))
}

export const dynamicParams = false
