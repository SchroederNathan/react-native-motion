'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

const STORAGE_KEY = 'scroll-positions'

function getPositions(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

export function ScrollRestoration() {
  const pathname = usePathname()
  const lastPathname = useRef(pathname)

  useEffect(() => {
    window.history.scrollRestoration = 'manual'
  }, [])

  // Continuously save scroll position
  useEffect(() => {
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const pos = getPositions()
        pos[pathname] = window.scrollY
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pos))
        ticking = false
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [pathname])

  // Block Next.js scroll-to-top and restore our position synchronously
  useLayoutEffect(() => {
    if (lastPathname.current === pathname) return
    lastPathname.current = pathname

    const positions = getPositions()
    const saved = positions[pathname]
    if (saved == null || saved === 0) return

    // Monkey-patch scrollTo to block Next.js from scrolling to top
    const original = window.scrollTo
    window.scrollTo = function (...args: any[]) {
      // Block any scroll-to-top calls (y=0)
      if (args.length === 2 && args[1] === 0) return
      if (args.length === 1 && typeof args[0] === 'object' && args[0]?.top === 0) return
      return original.apply(this, args as any)
    }

    // Restore our saved position immediately
    original.call(window, 0, saved)

    // Restore original scrollTo after Next.js is done
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo = original
      })
    })
  }, [pathname])

  return null
}
