'use client'

import { useEffect } from 'react'

let isFirstLoad = true

export function FirstLoadOnly() {
  const shouldAnimate = isFirstLoad

  useEffect(() => {
    isFirstLoad = false
  }, [])

  if (shouldAnimate) return null

  return (
    <style>{`.blur-fade-in { animation: none !important; opacity: 1 !important; filter: none !important; transform: none !important; }`}</style>
  )
}
