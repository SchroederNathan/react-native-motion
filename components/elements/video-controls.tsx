'use client'

import { clsx } from 'clsx/lite'
import { motion } from 'motion/react'
import { useRef, type PointerEvent } from 'react'

import { PauseIcon } from '@/components/icons/pause'
import { PlayIcon } from '@/components/icons/play'

type Props = {
  playing: boolean
  progress: number
  visible: boolean
  onTogglePlay: () => void
  onSeekStart: () => void
  onSeek: (fraction: number) => void
  onSeekEnd: () => void
  className?: string
}

export function VideoControls({
  playing,
  progress,
  visible,
  onTogglePlay,
  onSeekStart,
  onSeek,
  onSeekEnd,
  className,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const scrubbingRef = useRef(false)

  const fractionFromEvent = (e: PointerEvent<HTMLDivElement>) => {
    const el = trackRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    return Math.max(0, Math.min(1, x / rect.width))
  }

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    scrubbingRef.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    onSeekStart()
    onSeek(fractionFromEvent(e))
  }

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!scrubbingRef.current) return
    onSeek(fractionFromEvent(e))
  }

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!scrubbingRef.current) return
    scrubbingRef.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}
    onSeekEnd()
  }

  const pct = Math.max(0, Math.min(1, progress)) * 100

  return (
    <div
      data-visible={visible ? 'true' : 'false'}
      className={clsx(
        'pointer-events-none flex items-center gap-3 px-3 pb-3 pt-8 bg-gradient-to-t from-black/60 via-black/30 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 data-[visible=true]:opacity-100',
        className,
      )}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        aria-label={playing ? 'Pause' : 'Play'}
        onClick={(e) => {
          e.stopPropagation()
          onTogglePlay()
        }}
        className="pointer-events-auto flex size-8 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        {playing ? (
          <PauseIcon className="size-4" />
        ) : (
          <PlayIcon className="size-4" />
        )}
      </button>
      <div
        ref={trackRef}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="pointer-events-auto relative flex h-5 flex-1 cursor-pointer items-center"
      >
        <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/25">
          <motion.div
            className="absolute inset-y-0 left-0 bg-white"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
