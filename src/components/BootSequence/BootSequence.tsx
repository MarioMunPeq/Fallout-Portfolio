import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrameSequence } from '../../hooks/useFrameSequence'
import './BootSequence.css'

export interface BootSequenceProps {
  frames: readonly string[]
  frameIntervalMs?: number
  durationMs?: number
  onBootComplete?: () => void
}

/** Vault-Tec POST lines. The waits are proportional to the run length. */
const BOOT_LINES: readonly {
  text: string
  delay: number
  kind: 'title' | 'log' | 'ok'
}[] = [
  { text: 'ROBCO INDUSTRIES (TM) PIP-BOY 3000', delay: 300, kind: 'title' },
  { text: 'COPYRIGHT 2247 · ROBOTRON', delay: 340, kind: 'title' },
  { text: 'POWER ON SELF TEST .................. OK', delay: 380, kind: 'ok' },
  { text: 'CRT FILAMENT ....................... OK', delay: 340, kind: 'ok' },
  { text: 'PHOSPHOR COATING .................. OK', delay: 340, kind: 'ok' },
  { text: 'VAULT-TEC OS 1.4 ................... OK', delay: 380, kind: 'ok' },
  { text: 'OPERATOR: MUÑOZ PEQUEÑO, M.', delay: 360, kind: 'log' },
  { text: 'CLEARANCE: VAULT RESIDENT', delay: 340, kind: 'log' },
  { text: 'MOUNTING /VAULT/ARCHIVE ............', delay: 400, kind: 'log' },
]

export function BootSequence({
  frames,
  frameIntervalMs = 150,
  durationMs = 4200,
  onBootComplete,
}: BootSequenceProps) {
  const frameIndex = useFrameSequence(frames.length, {
    intervalMs: frameIntervalMs,
    mode: 'pingpong',
    durationMs,
    onComplete: onBootComplete,
  })

  const [revealed, setRevealed] = useState(0)
  const timers = useRef<number[]>([])

  // Reveal the log lines one at a time, spaced by their own delays.
  useEffect(() => {
    let elapsed = 0
    timers.current = BOOT_LINES.map((line, i) => {
      elapsed += line.delay
      return window.setTimeout(() => setRevealed(i + 1), elapsed)
    })
    return () => {
      timers.current.forEach(window.clearTimeout)
      timers.current = []
    }
  }, [])

  const visible = useMemo(
    () => BOOT_LINES.slice(0, revealed),
    [revealed],
  )

  if (frames.length === 0) return null

  return (
    <div className="boot">
      <img className="boot__frame" src={frames[frameIndex]} alt="" />

      <div className="boot__log">
        {visible.map((line) => (
          <p key={line.text} className="boot__line" data-kind={line.kind}>
            {line.text}
          </p>
        ))}
        <p className="boot__line boot__line--cursor">
          <span className="boot__cursor" aria-hidden="true" />
        </p>
      </div>

      <p className="boot__hint">PULSA PARA CONTINUAR</p>
    </div>
  )
}
