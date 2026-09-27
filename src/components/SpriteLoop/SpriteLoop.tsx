import { useFrameSequence } from '../../hooks/useFrameSequence'
import './SpriteLoop.css'

export interface SpriteLoopProps {
  frames: readonly string[]
  frameIntervalMs?: number
  /** Frame to start the loop from; the animation then plays on from there. */
  startFrame?: number
  className?: string
}

/**
 * Loops an animated sprite strip. The S.P.E.C.I.A.L. lamps are strips of 6-16
 * frames each; starting at the frame that matches the stat's value means the
 * animation both reads correctly and still flickers like the real device.
 */
export function SpriteLoop({
  frames,
  frameIntervalMs = 150,
  startFrame = 0,
  className,
}: SpriteLoopProps) {
  const frameIndex = useFrameSequence(frames.length, {
    intervalMs: frameIntervalMs,
    loop: true,
  })

  if (frames.length === 0) return null

  const src = frames[(startFrame + frameIndex) % frames.length]

  return (
    <div className={className}>
      <img className="sprite-loop__frame" src={src} alt="" />
    </div>
  )
}
