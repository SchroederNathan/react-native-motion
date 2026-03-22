'use client'

import { clsx } from 'clsx/lite'
import type { ComponentProps } from 'react'

export function VideoDemo({
  src,
  className,
  ...props
}: { src: string } & Omit<ComponentProps<'video'>, 'src'>) {
  return (
    <div className={clsx('relative aspect-square overflow-hidden rounded-2xl bg-taupe-200', className)}>
      <video
        src={src}
        autoPlay
        muted
        loop
        playsInline
        className="h-full w-full object-cover"
        {...props}
      />
      <div className="pointer-events-none absolute inset-0 rounded-2xl image-outline" />
    </div>
  )
}
