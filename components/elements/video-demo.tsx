'use client'

import { clsx } from 'clsx/lite'
import { AnimatePresence, motion } from 'motion/react'
import {
  type ComponentProps,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

import { VideoControls } from './video-controls'

export function VideoDemo({
  src,
  className,
  ...props
}: { src: string } & Omit<ComponentProps<'video'>, 'src'>) {
  const inlineRef = useRef<HTMLVideoElement>(null)
  const modalRef = useRef<HTMLVideoElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [playing, setPlaying] = useState(true)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [touchVisible, setTouchVisible] = useState(false)
  const scrubbingRef = useRef(false)
  const touchTimerRef = useRef<number | null>(null)
  const playingRef = useRef(playing)
  const progressRef = useRef(progress)

  useEffect(() => {
    playingRef.current = playing
  }, [playing])
  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  const onLoadedData = useCallback(() => {
    setLoaded(true)
  }, [])

  useLayoutEffect(() => {
    const el = inlineRef.current
    if (!el) return
    if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      setLoaded(true)
    }
  }, [src])

  useEffect(() => {
    setMounted(true)
  }, [])

  // Listen to events on the currently-active video element
  useEffect(() => {
    const el = expanded ? modalRef.current : inlineRef.current
    if (!el) return
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onTime = () => {
      if (!scrubbingRef.current) setProgress(el.currentTime)
    }
    const onDuration = () => {
      if (Number.isFinite(el.duration)) setDuration(el.duration)
    }
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('durationchange', onDuration)
    el.addEventListener('loadedmetadata', onDuration)
    setPlaying(!el.paused)
    if (Number.isFinite(el.duration)) setDuration(el.duration)
    if (!scrubbingRef.current) setProgress(el.currentTime)
    return () => {
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('durationchange', onDuration)
      el.removeEventListener('loadedmetadata', onDuration)
    }
  }, [expanded])

  // Carry currentTime + playing state across the inline ↔ modal transition.
  // Only one video is mounted at a time; refs from playingRef/progressRef
  // capture the last-active video's state at the moment of transition.
  useLayoutEffect(() => {
    const el = expanded ? modalRef.current : inlineRef.current
    if (!el) return
    const targetTime = progressRef.current
    const targetPlaying = playingRef.current
    const apply = () => {
      try {
        if (Number.isFinite(el.duration) && el.duration > 0) {
          el.currentTime = targetTime
        }
      } catch {}
      if (targetPlaying) el.play().catch(() => {})
      else el.pause()
    }
    if (el.readyState >= HTMLMediaElement.HAVE_METADATA) {
      apply()
      return
    }
    el.addEventListener('loadedmetadata', apply, { once: true })
    return () => el.removeEventListener('loadedmetadata', apply)
  }, [expanded])

  useEffect(() => {
    if (!expanded) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [expanded])

  useEffect(
    () => () => {
      if (touchTimerRef.current !== null) {
        window.clearTimeout(touchTimerRef.current)
      }
    },
    [],
  )

  const activeVideo = () =>
    expanded ? modalRef.current : inlineRef.current

  const togglePlay = useCallback(() => {
    const el = activeVideo()
    if (!el) return
    if (el.paused) el.play().catch(() => {})
    else el.pause()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded])

  const handleSeekStart = useCallback(() => {
    scrubbingRef.current = true
  }, [])
  const handleSeek = useCallback(
    (fraction: number) => {
      const el = activeVideo()
      if (!el) return
      const dur = Number.isFinite(el.duration) ? el.duration : 0
      if (dur <= 0) return
      const t = fraction * dur
      try {
        el.currentTime = t
      } catch {}
      setProgress(t)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expanded],
  )
  const handleSeekEnd = useCallback(() => {
    scrubbingRef.current = false
  }, [])

  const handleWrapperPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'touch') return
    setTouchVisible(true)
    if (touchTimerRef.current !== null) {
      window.clearTimeout(touchTimerRef.current)
    }
    touchTimerRef.current = window.setTimeout(() => {
      setTouchVisible(false)
      touchTimerRef.current = null
    }, 2500)
  }

  const layoutId = `video-demo-${src}`
  const progressFraction = duration > 0 ? progress / duration : 0
  const controlsVisible = !playing || touchVisible

  const controls = (
    <VideoControls
      playing={playing}
      progress={progressFraction}
      visible={controlsVisible}
      onTogglePlay={togglePlay}
      onSeekStart={handleSeekStart}
      onSeek={handleSeek}
      onSeekEnd={handleSeekEnd}
      className="absolute inset-x-0 bottom-0 z-20"
    />
  )

  return (
    <>
      {expanded ? (
        <div
          aria-hidden
          className={clsx('w-full aspect-square', className)}
        />
      ) : (
        <motion.div
          layoutId={layoutId}
          onPointerDown={handleWrapperPointerDown}
          className={clsx(
            'group relative w-full aspect-square overflow-hidden rounded-2xl bg-taupe-200 block',
            className,
          )}
        >
          <video
            ref={inlineRef}
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
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label="Expand preview"
            className="absolute inset-0 z-10 cursor-zoom-in"
          />
          {controls}
          <div className="pointer-events-none absolute inset-0 rounded-2xl image-outline" />
        </motion.div>
      )}

      {mounted &&
        createPortal(
          <AnimatePresence>
            {expanded && (
              <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center cursor-zoom-out"
                onClick={() => setExpanded(false)}
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 bg-black/50 backdrop-blur-md"
                />
                <motion.div
                  layoutId={layoutId}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={handleWrapperPointerDown}
                  className="group relative aspect-square h-[85vh] max-h-[85vw] max-w-[85vw] overflow-hidden rounded-2xl bg-taupe-200 shadow-2xl cursor-default"
                >
                  <video
                    ref={modalRef}
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
                  {controls}
                  <div className="pointer-events-none absolute inset-0 rounded-2xl image-outline" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  )
}
