'use client'

import { clsx } from 'clsx/lite'
import { type ComponentProps, type ReactNode, useCallback, useState } from 'react'

export function InstallCommand({
  snippet,
  className,
  ...props
}: {
  snippet: ReactNode
} & ComponentProps<'div'>) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    const text = typeof snippet === 'string' ? snippet : ''
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [snippet])

  return (
    <div
      className={clsx(
        'flex items-center justify-between gap-6 rounded-full bg-taupe-50 p-1 font-mono text-sm/7 text-taupe-600 inset-ring-1 inset-ring-taupe-950/10 dark:bg-taupe-50/10 dark:text-taupe-50 dark:inset-ring-taupe-50/10',
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-2 pl-3">
        <div className="text-current/60 select-none">$</div>
        <span>{snippet}</span>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="group relative flex size-9 items-center justify-center rounded-full after:absolute after:-inset-1 hover:bg-taupe-950/10 dark:hover:bg-taupe-50/10"
      >
        {copied ? (
          <svg width={13} height={13} viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth={1} className="inline-block">
            <path d="M1.5 6.5L5.5 11.5L11.5 1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
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
        )}
      </button>
    </div>
  )
}
