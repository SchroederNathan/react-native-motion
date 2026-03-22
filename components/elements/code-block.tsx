'use client'

import {
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react'

export function CodeBlock({ children }: { children: ReactNode }) {
  const codeRef = useRef<HTMLPreElement>(null)
  const [copied, setCopied] = useState(false)
  const [lineCount, setLineCount] = useState(0)

  const measureRef = useCallback((node: HTMLPreElement | null) => {
    codeRef.current = node
    if (node) {
      const text = node.textContent || ''
      const lines = text.replace(/\n$/, '').split('\n')
      setLineCount(lines.length)
    }
  }, [])

  const handleCopy = useCallback(() => {
    if (codeRef.current) {
      const text = codeRef.current.textContent || ''
      navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [])

  return (
    <pre
      ref={measureRef}
      className="group/code relative overflow-x-auto rounded-xl bg-taupe-200/70 dark:bg-taupe-500/10 text-sm text-taupe-900 dark:text-taupe-100 mb-4"
    >
      <button
        type="button"
        onClick={handleCopy}
        className="absolute top-2 right-2 z-10 flex size-10 items-center justify-center rounded-lg transition-[scale,background-color] duration-150 hover:bg-taupe-500/10 dark:hover:bg-taupe-50/10 active:scale-[0.96]"
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
      <div className="flex">
        <div
          className="shrink-0 py-4 pl-4 pr-3 text-right select-none text-taupe-500 dark:text-taupe-500 font-mono text-xs"
          aria-hidden="true"
        >
          {lineCount > 0 && Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className="leading-6">
              {i + 1}
            </div>
          ))}
        </div>
        <div className="overflow-x-auto py-4 px-4 flex-1">
          {children}
        </div>
      </div>
    </pre>
  )
}
