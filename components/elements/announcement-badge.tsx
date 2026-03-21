'use client'

import { clsx } from 'clsx/lite'
import { motion } from 'motion/react'
import type { ComponentProps, ReactNode } from 'react'

function ArrowRightIcon({ className, ...props }: ComponentProps<'svg'>) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-hidden
      className={clsx('inline-block', className)}
      {...props}
    >
      <path
        d="M12.293 5.29273C12.6591 4.92662 13.2381 4.90402 13.6309 5.22437L13.707 5.29273L19.707 11.2927L19.7754 11.3689C20.0957 11.7617 20.0731 12.3407 19.707 12.7068L13.707 18.7068C13.3165 19.0973 12.6835 19.0973 12.293 18.7068C11.9025 18.3163 11.9025 17.6833 12.293 17.2927L16.5859 12.9998H5C4.44772 12.9998 4 12.552 4 11.9998C4 11.4475 4.44772 10.9998 5 10.9998H16.5859L12.293 6.7068L12.2246 6.63063C11.9043 6.23785 11.9269 5.65885 12.293 5.29273Z"
        fill="currentColor"
      />
    </svg>
  )
}

const tapTransition = { type: 'spring' as const, duration: 0.5, bounce: 0 }

export function AnnouncementBadge({
  text,
  badgeText,
  href,
  className,
  ...props
}: {
  text: ReactNode
  href: string
  badgeText: string
} & Omit<ComponentProps<typeof motion.a>, 'href' | 'children'>) {
  return (
    <motion.a
      href={href}
      whileTap={{ scale: 0.96 }}
      transition={tapTransition}
      {...props}
      className={clsx(
        'group relative inline-flex max-w-full gap-x-3 overflow-hidden text-sm/6 items-center rounded-full p-0.75',
        'bg-taupe-950/5 text-taupe-950 border-shadow hover:bg-taupe-950/5 dark:bg-taupe-50/5 dark:text-taupe-50 dark:inset-ring-1 dark:inset-ring-taupe-50/5 dark:hover:bg-taupe-50/5',
        className,
      )}
    >
      {badgeText && (
        <span className="bg-taupe-700 dark:bg-taupe-300 px-2.5 rounded-full py-1">
          <h3 className="text-xs font-medium text-taupe-100 dark:text-taupe-900  ">{badgeText}</h3>
        </span>
      )}
      <span className="text-pretty truncate line-clamp-1 ">{text}</span>
      <ArrowRightIcon className=" -ms-0.5 me-2" />

    </motion.a>
  )
}
