import { clsx } from 'clsx/lite'
import type { ComponentProps } from 'react'

const sizes = {
  md: 'px-3 py-1',
  lg: 'px-4 py-2',
}

export function ButtonLink({
  size = 'md',
  color = 'dark/light',
  className,
  href,
  ...props
}: {
  href: string
  size?: keyof typeof sizes
  color?: 'dark/light' | 'light'
} & Omit<ComponentProps<'a'>, 'href'>) {
  return (
    <a
      href={href}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center gap-1 rounded-xl text-sm/7 font-medium border-shadow',
        color === 'dark/light' &&
        'bg-taupe-950 text-taupe-50 hover:bg-taupe-800 dark:bg-taupe-300 dark:text-taupe-950 dark:hover:bg-taupe-200',
        color === 'light' && 'bg-taupe-50 text-taupe-950 hover:bg-taupe-100 dark:bg-taupe-100 dark:hover:bg-taupe-50',
        sizes[size],
        className,
      )}
      {...props}
    />
  )
}

export function PlainButtonLink({
  size = 'md',
  color = 'dark/light',
  href,
  className,
  ...props
}: {
  href: string
  size?: keyof typeof sizes
  color?: 'dark/light' | 'light'
} & Omit<ComponentProps<'a'>, 'href'>) {
  return (
    <a
      href={href}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl text-sm/7 font-medium border-shadow',
        color === 'dark/light' && 'text-taupe-950 dark:text-taupe-50',
        color === 'light' && 'text-taupe-50',
        sizes[size],
        className,
      )}
      {...props}
    />
  )
}
