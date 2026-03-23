'use client'

import { clsx } from 'clsx/lite'
import { motion, useInView } from 'motion/react'
import { useRef, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { AnimationMeta } from '@/lib/animations'

const MotionLink = motion.create(Link)

const tapTransition = { type: 'spring' as const, duration: 0.5, bounce: 0 }
const hoverBgTransition = { type: 'spring' as const, duration: 0.3, bounce: 0 }

export function AnimationCard({ animation, index = 0 }: { animation: AnimationMeta; index?: number }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLAnchorElement>(null)
  const isHovered = useRef(false)
  const [hovered, setHovered] = useState(false)
  const inView = useInView(containerRef, { amount: 0.3 })

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

  useEffect(() => {
    if (inView) {
      tryPlay()
    } else if (!isHovered.current) {
      tryPause()
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
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-taupe-200">
        <video
          ref={videoRef}
          src={animation.video}
          muted
          loop
          playsInline
          preload="metadata"
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
    </MotionLink>
  )
}
