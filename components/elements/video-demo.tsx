'use client'

import { clsx } from 'clsx/lite'
import { AnimatePresence, motion } from 'motion/react'
import {
  type ComponentProps,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

export function VideoDemo({
  src,
  className,
  ...props
}: { src: string } & Omit<ComponentProps<'video'>, 'src'>) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [mounted, setMounted] = useState(false)

  const onLoadedData = useCallback(() => {
    setLoaded(true)
  }, [])

  useLayoutEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      setLoaded(true)
    }
  }, [src])

  useEffect(() => {
    setMounted(true)
  }, [])

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

  const layoutId = `video-demo-${src}`

  const videoEl = (
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
  )

  return (
    <>
      {expanded ? (
        <div
          aria-hidden
          className={clsx('w-full aspect-square', className)}
        />
      ) : (
        <motion.button
          layoutId={layoutId}
          type="button"
          onClick={() => setExpanded(true)}
          aria-label="Expand preview"
          className={clsx(
            'relative w-full aspect-square overflow-hidden rounded-2xl bg-taupe-200 cursor-zoom-in block',
            className,
          )}
        >
          <video
            ref={videoRef}
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
        </motion.button>
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
                  className="relative aspect-square h-[85vh] max-h-[85vw] max-w-[85vw] overflow-hidden rounded-2xl bg-taupe-200 shadow-2xl cursor-default"
                >
                  {videoEl}
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
