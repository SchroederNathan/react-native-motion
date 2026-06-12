import { NextResponse } from 'next/server'
import { getAllAnimationMetas } from '@/lib/animations'

const BASE_URL = 'https://rnmotion.dev'

export async function GET() {
  const metas = await getAllAnimationMetas()

  const lines = [
    '# React Native Motion',
    '',
    '> React Native animation recipes with copy-paste code.',
    '',
    '## Animations',
    '',
    ...metas.map(
      (m) => `- [${m.title}](${BASE_URL}/animations/${m.slug}.md): ${m.description}`
    ),
    '',
  ]

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
