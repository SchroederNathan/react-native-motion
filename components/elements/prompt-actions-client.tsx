'use client'

import dynamic from 'next/dynamic'

const PromptActions = dynamic(
  () => import('./prompt-actions').then((m) => m.PromptActions),
  {
    ssr: false,
    loading: () => (
      <div className="inline-flex items-stretch border-shadow rounded-xl">
        <div className="inline-flex items-center gap-1.5 rounded-l-xl px-3 py-1 border-r border-taupe-600/20 dark:border-taupe-950/20 bg-taupe-700 dark:bg-taupe-300">
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" className="text-taupe-50 dark:text-taupe-950 shrink-0">
            <path d="M19.0001 18.75C20.5189 18.75 21.7501 17.5188 21.7501 16V4C21.7501 2.48122 20.5189 1.25 19.0001 1.25H9.00012C7.48134 1.25 6.25012 2.48122 6.25012 4V16C6.25012 17.5188 7.48134 18.75 9.00012 18.75H19.0001Z" fill="currentColor" />
            <path d="M2.25012 19.75V6.25C2.25012 5.69772 2.69784 5.25 3.25012 5.25C3.80241 5.25 4.25012 5.69772 4.25012 6.25V19.75C4.25012 20.3023 4.69784 20.75 5.25012 20.75H16.7501C17.3024 20.75 17.7501 21.1977 17.7501 21.75C17.7501 22.3023 17.3024 22.75 16.7501 22.75H5.25012C3.59327 22.75 2.25012 21.4069 2.25012 19.75Z" fill="currentColor" />
          </svg>
          <span className="text-sm/7 font-medium text-taupe-50 dark:text-taupe-950">Copy prompt</span>
        </div>
        <div className="inline-flex items-center justify-center rounded-r-xl px-2 bg-taupe-700 dark:bg-taupe-300">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-4 text-taupe-50 dark:text-taupe-950">
            <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    ),
  },
)

export function PromptActionsClient() {
  return <PromptActions />
}
