'use client'

import { clsx } from 'clsx/lite'
import { type ComponentProps, useCallback, useState } from 'react'

export function VideoDemo({
  src,
  className,
  ...props
}: { src: string } & Omit<ComponentProps<'video'>, 'src'>) {
  const [loaded, setLoaded] = useState(false)
  const onLoadedData = useCallback(() => setLoaded(true), [])

  return (
    <div className={clsx('relative aspect-square overflow-hidden rounded-2xl bg-taupe-200', className)}>
      <video
        src={src}
        autoPlay
        muted
        loop
        playsInline
        onLoadedData={onLoadedData}
        className={clsx(
          'h-full w-full object-cover transition-opacity duration-500',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
        {...props}
      />
      <div className="pointer-events-none absolute inset-0 rounded-2xl image-outline" />
    </div>
  )
}
