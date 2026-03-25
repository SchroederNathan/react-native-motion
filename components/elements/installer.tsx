'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export function Installer({ packages }: { packages: string[] }) {
  const [copied, setCopied] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const command = `npx expo install ${packages.join(' ')}`

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateScrollState()
    const observer = new ResizeObserver(updateScrollState)
    observer.observe(el)
    return () => observer.disconnect()
  }, [updateScrollState])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [command])

  return (
    <div className="mt-10 mb-10">
      <h3 className="text-lg/7 tracking-tight font-medium text-taupe-950 dark:text-taupe-50 mb-6">Install the following dependencies:</h3>
    <div className="flex items-center justify-between gap-6 rounded-xl bg-taupe-50 p-1 font-mono text-sm/7 text-taupe-600 inset-ring-1 inset-ring-taupe-950/10 dark:bg-taupe-50/[0.02] dark:text-taupe-50 dark:inset-ring-taupe-50/10">
      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="flex min-w-0 flex-1 items-center gap-2 pl-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          maskImage: `linear-gradient(to right, ${canScrollLeft ? 'transparent' : 'black'}, black 24px, black calc(100% - 24px), ${canScrollRight ? 'transparent' : 'black'})`,
        }}
      >
        <span className="text-current/60 select-none">$</span>
        <span className="whitespace-nowrap">{command}</span>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="group relative flex size-10 shrink-0 items-center justify-center rounded-lg transition-[scale,background-color] duration-150 hover:bg-taupe-500/10 dark:hover:bg-taupe-50/10 active:scale-[0.96]"
      >
        <span
          className="absolute inset-0 flex items-center justify-center transition-[opacity,scale,filter] duration-300 [transition-timing-function:cubic-bezier(0.2,0,0,1)]"
          style={{
            opacity: copied ? 0 : 1,
            scale: copied ? '0.25' : '1',
            filter: copied ? 'blur(4px)' : 'blur(0px)',
          }}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" className="inline-block">
            <path d="M19.0001 18.75C20.5189 18.75 21.7501 17.5188 21.7501 16V4C21.7501 2.48122 20.5189 1.25 19.0001 1.25H9.00012C7.48134 1.25 6.25012 2.48122 6.25012 4V16C6.25012 17.5188 7.48134 18.75 9.00012 18.75H19.0001Z" fill="currentColor" className="text-taupe-600 dark:text-taupe-400" />
            <path d="M2.25012 19.75V6.25C2.25012 5.69772 2.69784 5.25 3.25012 5.25C3.80241 5.25 4.25012 5.69772 4.25012 6.25V19.75C4.25012 20.3023 4.69784 20.75 5.25012 20.75H16.7501C17.3024 20.75 17.7501 21.1977 17.7501 21.75C17.7501 22.3023 17.3024 22.75 16.7501 22.75H5.25012C3.59327 22.75 2.25012 21.4069 2.25012 19.75Z" fill="currentColor" className="text-taupe-600 dark:text-taupe-400" />
          </svg>
        </span>
        <span
          className="absolute inset-0 flex items-center justify-center transition-[opacity,scale,filter] duration-300 [transition-timing-function:cubic-bezier(0.2,0,0,1)]"
          style={{
            opacity: copied ? 1 : 0,
            scale: copied ? '1' : '0.25',
            filter: copied ? 'blur(0px)' : 'blur(4px)',
          }}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" className="inline-block">
            <path fillRule="evenodd" clipRule="evenodd" d="M20.1757 5.26268C20.5828 5.63587 20.6103 6.26844 20.2372 6.67556L9.23715 18.6756C9.05285 18.8766 8.79441 18.9937 8.52172 18.9996C8.24903 19.0055 7.98576 18.8998 7.79289 18.7069L3.29289 14.2069C2.90237 13.8164 2.90237 13.1832 3.29289 12.7927C3.68342 12.4022 4.31658 12.4022 4.70711 12.7927L8.46859 16.5542L18.7628 5.32411C19.136 4.91699 19.7686 4.88948 20.1757 5.26268Z" fill="currentColor" className="text-taupe-600 dark:text-taupe-400" />
          </svg>
        </span>
      </button>
    </div>
    </div>
  )
}
