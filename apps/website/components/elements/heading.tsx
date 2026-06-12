import { clsx } from 'clsx/lite'
import type { ComponentProps } from 'react'

export function Heading({
  children,
  color = 'dark/light',
  className,
  ...props
}: { color?: 'dark/light' | 'light' } & ComponentProps<'h1'>) {
  return (
    <h1
      className={clsx(
        'font-display text-5xl/12 tracking-tight text-balance sm:text-[5rem]/20',
        color === 'dark/light' && 'text-taupe-950 dark:text-taupe-50',
        color === 'light' && 'text-taupe-50',
        className,
      )}
      {...props}
    >
      {children}
    </h1>
  )
}
