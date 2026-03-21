import { clsx } from 'clsx/lite'
import type { ComponentProps, ReactNode } from 'react'

function ChevronIcon({ className, ...props }: ComponentProps<'svg'>) {
  return (
    <svg
      width={5}
      height={8}
      viewBox="0 0 5 8"
      fill="currentColor"
      role="image"
      className={clsx('inline-block', className)}
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M.22.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06L1.28 7.78A.75.75 0 01.22 6.72L2.94 4 .22 1.28a.75.75 0 010-1.06z"
      />
    </svg>
  )
}

export function AnnouncementBadge({
  text,
  href,
  cta = 'Learn more',
  className,
  ...props
}: {
  text: ReactNode
  href: string
  cta?: ReactNode
} & Omit<ComponentProps<'a'>, 'href' | 'children'>) {
  return (
    <a
      href={href}
      {...props}
      className={clsx(
        'group relative inline-flex max-w-full gap-x-3 overflow-hidden rounded-md px-3.5 py-2 text-sm/6 max-sm:flex-col sm:items-center sm:rounded-full sm:px-3 sm:py-0.5',
        'bg-taupe-950/5 text-taupe-950 hover:bg-taupe-950/10 dark:bg-taupe-50/5 dark:text-taupe-50 dark:inset-ring-1 dark:inset-ring-taupe-50/5 dark:hover:bg-taupe-50/10',
        className,
      )}
    >
      <span className="text-pretty sm:truncate">{text}</span>
      <span className="h-3 w-px bg-taupe-950/20 max-sm:hidden dark:bg-taupe-50/10" />
      <span className="inline-flex shrink-0 items-center gap-2 font-semibold text-taupe-950 dark:text-taupe-50">
        {cta} <ChevronIcon className="shrink-0 translate-x-px" />
      </span>
    </a>
  )
}
