import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const LLM_USER_AGENTS = [
  'ChatGPT',
  'GPTBot',
  'Claude',
  'ClaudeBot',
  'Anthropic',
  'anthropic-ai',
  'PerplexityBot',
  'Cohere',
  'CCBot',
  'Google-Extended',
  'Applebot-Extended',
  'FacebookBot',
  'Bytespider',
]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // /animations/slug.md → serve markdown
  const mdMatch = pathname.match(/^\/animations\/([^/]+)\.md$/)
  if (mdMatch) {
    const slug = mdMatch[1]
    const url = request.nextUrl.clone()
    url.pathname = `/api/animations/${slug}/md`
    return NextResponse.rewrite(url)
  }

  // /animations/slug with LLM user-agent → serve markdown
  const animMatch = pathname.match(/^\/animations\/([^/]+)$/)
  if (animMatch) {
    const ua = request.headers.get('user-agent') ?? ''
    if (LLM_USER_AGENTS.some((bot) => ua.includes(bot))) {
      const slug = animMatch[1]
      const url = request.nextUrl.clone()
      url.pathname = `/api/animations/${slug}/md`
      return NextResponse.rewrite(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/animations/:path*',
}
