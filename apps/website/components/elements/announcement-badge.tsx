import { clsx } from 'clsx/lite'
import type { ComponentProps, ReactNode } from 'react'

export function AnnouncementBadge({
  text,
  badgeText,
  className,
  ...props
}: {
  text: ReactNode
  badgeText: string
} & Omit<ComponentProps<'div'>, 'children'>) {
  return (
    <div
      {...props}
      className={clsx(
        'relative inline-flex max-w-full gap-x-3 overflow-hidden text-sm/6 items-center rounded-full p-0.75',
        'bg-taupe-950/5 text-taupe-950 border-shadow dark:bg-taupe-50/5 dark:text-taupe-50 dark:inset-ring-1 dark:inset-ring-taupe-50/5',
        className,
      )}
    >
      {badgeText && (
        <span className="bg-taupe-700 dark:bg-taupe-300 px-2.5 rounded-full py-1">
          <h3 className="text-xs font-medium text-taupe-100 dark:text-taupe-900  ">{badgeText}</h3>
        </span>
      )}
      <span className="text-pretty truncate line-clamp-1 me-2.5">{text}</span>
    </div>
  )
}
