'use client'

import { clsx } from 'clsx/lite'
import {
  type ComponentProps,
  ViewTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { videoCache, captureWhenIdle } from '@/lib/video-cache'

export function VideoDemo({
  src,
  className,
  transitionName,
  ...props
}: { src: string; transitionName?: string } & Omit<ComponentProps<'video'>, 'src'>) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const lastTime = useRef(0)
  const entry = videoCache.get(src)
  const [loaded, setLoaded] = useState(!!entry)
  const onLoadedData = useCallback(() => {
    if (!videoCache.has(src)) {
      videoCache.set(src, { time: 0, poster: '' })
    }
    setLoaded(true)
    const el = videoRef.current
    if (el) captureWhenIdle(el, src)
  }, [src])

  // Restore currentTime for cached videos and check readyState
  useLayoutEffect(() => {
    const el = videoRef.current
    if (!el) return
    const saved = videoCache.get(src)
    if (saved) {
      el.currentTime = saved.time
      lastTime.current = saved.time
    }
    if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      setLoaded(true)
    }
  }, [src])

  // Only update the ref, not the cache map
  const onTimeUpdate = useCallback(() => {
    const el = videoRef.current
    if (el) {
      lastTime.current = el.currentTime
    }
  }, [])

  // Save time on unmount
  useEffect(() => {
    return () => {
      const existing = videoCache.get(src)
      if (existing) {
        existing.time = lastTime.current
      }
    }
  }, [src])

  const content = (
    <div className={clsx('relative aspect-square overflow-hidden rounded-2xl bg-taupe-200', className)}>
      <video
        ref={videoRef}
        src={src}
        autoPlay
        muted
        loop
        playsInline
        poster={entry?.poster || undefined}
        onLoadedData={onLoadedData}
        onTimeUpdate={onTimeUpdate}
        className={clsx(
          'h-full w-full object-cover transition-opacity',
          entry ? 'duration-0' : 'duration-500',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
        {...props}
      />
      <div className="pointer-events-none absolute inset-0 rounded-2xl image-outline" />
    </div>
  )

  if (transitionName) {
    return <ViewTransition name={transitionName}>{content}</ViewTransition>
  }

  return content
}
