import { clsx } from 'clsx/lite'
import type { ComponentProps } from 'react'

export function Container({ children, className, ...props }: ComponentProps<'div'>) {
  return (
    <div className={clsx('mx-auto w-full px-6 sm:max-w-2xl md:max-w-3xl lg:max-w-7xl lg:px-10', className)} {...props}>
      {children}
    </div>
  )
}
