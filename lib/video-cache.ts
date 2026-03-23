/** Module-level cache tracking loaded videos, their playback time, and a poster frame. Persists across App Router navigations. */
export const videoCache = new Map<string, { time: number; poster: string }>()

/** Shared canvas element reused across all captureFrame calls. */
let sharedCanvas: HTMLCanvasElement | null = null

/** Capture the current frame of a video element as a blob URL (async, off main thread encoding). */
export function captureFrameAsync(video: HTMLVideoElement): Promise<string> {
  return new Promise((resolve) => {
    try {
      if (!sharedCanvas) {
        sharedCanvas = document.createElement('canvas')
      }
      sharedCanvas.width = video.videoWidth
      sharedCanvas.height = video.videoHeight
      const ctx = sharedCanvas.getContext('2d')
      if (!ctx) { resolve(''); return }
      ctx.drawImage(video, 0, 0)
      sharedCanvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(URL.createObjectURL(blob))
          } else {
            resolve('')
          }
        },
        'image/webp',
        0.7,
      )
    } catch {
      resolve('')
    }
  })
}

/** Schedule a poster capture during idle time. */
export function captureWhenIdle(video: HTMLVideoElement, src: string) {
  const schedule = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 50))
  schedule(() => {
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return
    captureFrameAsync(video).then((poster) => {
      if (!poster) return
      const existing = videoCache.get(src)
      if (existing) {
        // Revoke old blob URL to avoid memory leaks
        if (existing.poster) URL.revokeObjectURL(existing.poster)
        existing.poster = poster
      }
    })
  })
}
