'use client'

import { useCallback, useState } from 'react'

export function Installer({ packages }: { packages: string[] }) {
  const [copied, setCopied] = useState(false)

  const command = `npx expo install ${packages.join(' ')}`

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [command])

  return (
    <div className="flex items-center justify-between gap-6 rounded-xl bg-taupe-50 p-1 font-mono text-sm/7 text-taupe-600 inset-ring-1 inset-ring-taupe-950/10 dark:bg-taupe-50/10 dark:text-taupe-50 dark:inset-ring-taupe-50/10 mb-6">
      <div className="flex items-center gap-2 pl-3 overflow-x-auto">
        <span className="text-current/60 select-none">$</span>
        <span className="whitespace-nowrap">{command}</span>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="group relative flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-150 after:absolute after:-inset-1 after:content-[''] hover:bg-taupe-950/10 dark:hover:bg-taupe-50/10"
      >
        <span
          className="absolute inset-0 flex items-center justify-center transition-[opacity,scale,filter] duration-300 [transition-timing-function:cubic-bezier(0.2,0,0,1)]"
          style={{
            opacity: copied ? 0 : 1,
            scale: copied ? '0.5' : '1',
            filter: copied ? 'blur(4px)' : 'blur(0px)',
          }}
        >
          <svg width={13} height={13} viewBox="0 0 13 13" fill="none" strokeWidth={1} className="inline-block">
            <path
              d="M12.5 11.5V5.5C12.5 4.94772 12.0523 4.5 11.5 4.5H8.5V7.5C8.5 8.05228 8.05228 8.5 7.5 8.5H4.5V11.5C4.5 12.0523 4.94772 12.5 5.5 12.5H11.5C12.0523 12.5 12.5 12.0523 12.5 11.5Z"
              fill="currentColor"
              fillOpacity="0.2"
            />
            <path
              d="M0.5 1.5C0.5 0.947715 0.947715 0.5 1.5 0.5H7.5C8.05228 0.5 8.5 0.947715 8.5 1.5V7.5C8.5 8.05228 8.05228 8.5 7.5 8.5H1.5C0.947715 8.5 0.5 8.05228 0.5 7.5V1.5Z"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8.5 4.5H11.5C12.0523 4.5 12.5 4.94772 12.5 5.5V11.5C12.5 12.0523 12.0523 12.5 11.5 12.5H5.5C4.94772 12.5 4.5 12.0523 4.5 11.5V8.5"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
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
          <svg width={13} height={13} viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth={1} className="inline-block">
            <path d="M1.5 6.5L5.5 11.5L11.5 1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
    </div>
  )
}
