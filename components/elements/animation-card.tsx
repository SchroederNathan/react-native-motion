'use client'

import { clsx } from 'clsx/lite'
import { motion, useInView } from 'motion/react'
import { ViewTransition, useRef, useState, useEffect, useCallback, useLayoutEffect } from 'react'
import Link from 'next/link'
import type { AnimationMeta } from '@/lib/animations'
import { videoCache, captureWhenIdle } from '@/lib/video-cache'

const MotionLink = motion.create(Link)

const tapTransition = { type: 'spring' as const, duration: 0.5, bounce: 0 }
const hoverBgTransition = { type: 'spring' as const, duration: 0.3, bounce: 0 }

export function AnimationCard({ animation, index = 0 }: { animation: AnimationMeta; index?: number }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLAnchorElement>(null)
  const isHovered = useRef(false)
  const [hovered, setHovered] = useState(false)
  const entry = videoCache.get(animation.video)
  const [loaded, setLoaded] = useState(!!entry)
  const inView = useInView(containerRef, { amount: 0.3 })

  const lastTime = useRef(0)
  const mounted = useRef(true)

  const onLoadedData = useCallback(() => {
    if (!videoCache.has(animation.video)) {
      videoCache.set(animation.video, { time: 0, poster: '' })
    }
    setLoaded(true)
    // Capture poster during idle time — non-blocking
    const el = videoRef.current
    if (el) captureWhenIdle(el, animation.video)
  }, [animation.video])

  // Restore currentTime for cached videos and check readyState
  useLayoutEffect(() => {
    const el = videoRef.current
    if (!el) return
    const saved = videoCache.get(animation.video)
    if (saved) {
      el.currentTime = saved.time
      lastTime.current = saved.time
    }
    if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      setLoaded(true)
    }
  }, [animation.video])

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
      const existing = videoCache.get(animation.video)
      if (existing) {
        existing.time = lastTime.current
      }
    }
  }, [animation.video])

  const tryPlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.play().catch(() => {})
  }, [])

  const tryPause = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.pause()
    video.currentTime = 0
  }, [])

  // Autoplay first card on mount (for mobile)
  useEffect(() => {
    if (index === 0) {
      tryPlay()
    }
  }, [index, tryPlay])

  // Skip the first inView=false cycle on mount so we don't reset cached time
  useEffect(() => {
    if (!mounted.current) {
      if (inView) {
        tryPlay()
      } else if (!isHovered.current) {
        tryPause()
      }
    } else if (inView) {
      mounted.current = false
      tryPlay()
    }
  }, [inView, tryPlay, tryPause])

  return (
    <MotionLink
      ref={containerRef}
      href={`/animations/${animation.slug}`}
      whileTap={{ scale: 0.96 }}
      transition={tapTransition}
      className={clsx(
        'group relative flex flex-col gap-3',
        'transition-shadow duration-150 ease-out',
        'hover:border-shadow',
      )}
      onMouseEnter={() => {
        isHovered.current = true
        setHovered(true)
        tryPlay()
      }}
      onMouseLeave={() => {
        isHovered.current = false
        setHovered(false)
        if (!inView) {
          tryPause()
        }
      }}
    >
      <motion.div
        className="pointer-events-none absolute -inset-3 rounded-2xl bg-taupe-950/5 dark:bg-taupe-50/10"
        initial={false}
        animate={{
          scale: hovered ? 1 : 0.92,
          opacity: hovered ? 1 : 0,
        }}
        transition={hoverBgTransition}
      />
      <ViewTransition name={`video-${animation.slug}`}>
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-taupe-200">
          <video
            ref={videoRef}
            src={animation.video}
            muted
            loop
            playsInline
            preload="metadata"
            poster={entry?.poster || undefined}
            onLoadedData={onLoadedData}
            onTimeUpdate={onTimeUpdate}
            className={clsx(
              'absolute inset-0 h-full w-full object-cover transition-opacity',
              entry ? 'duration-0' : 'duration-500',
              loaded ? 'opacity-100' : 'opacity-0',
            )}
          />
          <div className="pointer-events-none absolute inset-0 rounded-xl image-outline" />
        </div>
      </ViewTransition>
      <div className="px-1">
        <h3 className="text-sm/6 font-medium text-taupe-950 dark:text-taupe-50">
          {animation.title}
        </h3>
        <p className="text-sm/6 text-taupe-500 dark:text-taupe-400">
          {animation.description}
        </p>
      </div>
    </MotionLink>
  )
}
