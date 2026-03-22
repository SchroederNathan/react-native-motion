import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const mdMatch = pathname.match(/^\/animations\/([^/]+)\.md$/)
  if (mdMatch) {
    const slug = mdMatch[1]
    const url = request.nextUrl.clone()
    url.pathname = `/api/animations/${slug}/md`
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/animations/:path*.md',
}
