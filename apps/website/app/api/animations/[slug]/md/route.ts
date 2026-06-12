import fs from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'
import { getAllAnimationSlugs } from '@/lib/animations'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const filePath = path.join(
    process.cwd(), 'content', 'animations', slug, 'llm.md'
  )

  if (!fs.existsSync(filePath)) {
    return new NextResponse('Not found', { status: 404 })
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  })
}

export function generateStaticParams() {
  return getAllAnimationSlugs().map((slug) => ({ slug }))
}
