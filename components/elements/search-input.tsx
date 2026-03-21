'use client'

import { clsx } from 'clsx/lite'
import type { ComponentProps } from 'react'

export function SearchInput({
  className,
  ...props
}: ComponentProps<'input'>) {
  return (
    <div
      className={clsx(
        'flex items-center gap-3 rounded-xl bg-taupe-50 px-2 py-1.5 text-sm/7 border-shadow dark:bg-taupe-900',
        className,
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="ml-1 size-4 shrink-0 text-taupe-400 dark:text-taupe-500"
      >
        <path
          fillRule="evenodd"
          d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
          clipRule="evenodd"
        />
      </svg>
      <input
        type="text"
        placeholder="Search animations..."
        className="w-full bg-transparent text-taupe-950 placeholder:text-taupe-400 focus:outline-none dark:text-taupe-50 dark:placeholder:text-taupe-500"
        {...props}
      />
    </div>
  )
}
