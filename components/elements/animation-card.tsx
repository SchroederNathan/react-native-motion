'use client'

import { clsx } from 'clsx/lite'
import { motion, useInView } from 'motion/react'
import { useRef, useEffect, useCallback } from 'react'
import type { AnimationMeta } from '@/lib/animations'

const tapTransition = { type: 'spring' as const, duration: 0.5, bounce: 0 }

export function AnimationCard({ animation }: { animation: AnimationMeta }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isHovered = useRef(false)
  const inView = useInView(containerRef, { amount: 0.5 })

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

  useEffect(() => {
    if (inView) {
      tryPlay()
    } else if (!isHovered.current) {
      tryPause()
    }
  }, [inView, tryPlay, tryPause])

  return (
    <motion.a
      ref={containerRef}
      href={`/animations/${animation.slug}`}
      whileTap={{ scale: 0.96 }}
      transition={tapTransition}
      className={clsx(
        'group relative flex flex-col gap-3 rounded-2xl p-3',
        'transition-[box-shadow,background-color] duration-150 ease-out',
        'hover:bg-taupe-950/[0.03] dark:hover:bg-taupe-50/[0.03]',
        'hover:border-shadow',
      )}
      onMouseEnter={() => {
        isHovered.current = true
        tryPlay()
      }}
      onMouseLeave={() => {
        isHovered.current = false
        if (!inView) {
          tryPause()
        }
      }}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-taupe-200/50 dark:bg-taupe-800/50">
        <video
          ref={videoRef}
          src={animation.video}
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 rounded-xl image-outline" />
      </div>
      <div className="px-1">
        <h3 className="text-sm/6 font-medium text-taupe-950 dark:text-taupe-50">
          {animation.title}
        </h3>
        <p className="text-sm/6 text-taupe-500 dark:text-taupe-400">
          {animation.description}
        </p>
      </div>
    </motion.a>
  )
}
