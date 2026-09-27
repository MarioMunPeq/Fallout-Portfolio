import { useEffect, useRef, useState } from 'react'

export type FrameSequenceMode = 'loop' | 'pingpong'

export interface FrameSequenceOptions {
  intervalMs: number
  /** Force looping regardless of `mode`. */
  loop?: boolean
  mode?: FrameSequenceMode
  /** Stop after this long and fire `onComplete`. Omit to run forever. */
  durationMs?: number
  onComplete?: () => void
}

/**
 * Drives an animated sprite strip.
 *
 * Two things this deliberately avoids, both of which were bugs in the old
 * version:
 *  - The ping-pong direction used to be flipped inside the `setFrameIndex`
 *    updater. React re-invokes updaters (StrictMode does it on every render),
 *    so the direction advanced twice per tick and the animation ran at double
 *    speed with skipped frames. The step is now computed purely from the
 *    current index, with no ref mutation.
 *  - `looping` was `|| !!durationMs`, which made the non-looping advance path
 *    unreachable whenever a duration was set. The two modes are now explicit.
 */
export function useFrameSequence(
  frameCount: number,
  { intervalMs, loop = false, mode = 'loop', durationMs, onComplete }: FrameSequenceOptions,
): number {
  const [frameIndex, setFrameIndex] = useState(0)
  const doneRef = useRef(false)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  })

  const lastIndex = frameCount - 1
  const valid = lastIndex >= 0

  // Overall run timer.
  useEffect(() => {
    if (!durationMs) return
    doneRef.current = false
    const id = window.setTimeout(() => {
      doneRef.current = true
      onCompleteRef.current?.()
    }, durationMs)
    return () => window.clearTimeout(id)
  }, [durationMs, frameCount])

  // Frame advance.
  useEffect(() => {
    if (!valid || doneRef.current) return

    const id = window.setTimeout(() => {
      setFrameIndex((index) => {
        if (lastIndex === 0) return 0
        if (mode === 'pingpong') {
          // Bounce without any mutable state: a forward step that would
          // overshoot the end becomes a backward step from the end.
          const forward = index + 1
          if (forward > lastIndex) return lastIndex - 1
          const backward = index - 1
          if (backward < 0) return 1
          return forward
        }
        // `loop` forces cycling even when a mode is set explicitly.
        return loop || mode === 'loop' ? (index + 1) % frameCount : index + 1
      })
    }, intervalMs)

    return () => window.clearTimeout(id)
  }, [valid, frameIndex, intervalMs, loop, mode, frameCount, lastIndex])

  // Non-looping: fire onComplete once the last frame has been shown.
  useEffect(() => {
    if (!valid || loop || mode === 'loop' || mode === 'pingpong' || durationMs) {
      return
    }
    if (frameIndex < lastIndex) return
    if (doneRef.current) return
    doneRef.current = true
    onCompleteRef.current?.()
  }, [valid, loop, mode, durationMs, frameIndex, lastIndex])

  return valid ? frameIndex : 0
}
