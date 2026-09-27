import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

interface ScopeWire {
  analyser: AnalyserNode
  ctx: AudioContext
}

/**
 * One AudioContext per <audio> element, ever. createMediaElementSource throws
 * if you call it twice on the same element, and React remounts this component
 * every time the RADIO tab is opened — so the wire has to be cached outside
 * React.
 */
const scopeWires = new WeakMap<HTMLAudioElement, ScopeWire>()

function createScopeWire(audio: HTMLAudioElement): ScopeWire | null {
  const cached = scopeWires.get(audio)
  if (cached) return cached

  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!Ctor) return null

  try {
    const ctx = new Ctor()
    const source = ctx.createMediaElementSource(audio)
    const analyser = ctx.createAnalyser()
    // 2048 gives a usable low end without smearing the transients.
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.72
    analyser.minDecibels = -85
    analyser.maxDecibels = -18
    source.connect(analyser)
    analyser.connect(ctx.destination)

    const wire: ScopeWire = { analyser, ctx }
    scopeWires.set(audio, wire)
    return wire
  } catch {
    return null
  }
}

function theme() {
  const s = getComputedStyle(document.documentElement)
  const read = (name: string, fallback: string) =>
    s.getPropertyValue(name).trim() || fallback
  return {
    color: read('--pipboy-color', '#9ece6a'),
    hot: read('--pipboy-hot', '#d8ffb0'),
    faint: read('--pipboy-color-faint', 'rgba(158,206,106,.22)'),
    deep: read('--pipboy-color-deep', 'rgba(158,206,106,.08)'),
    screen: read('--screen-bg', '#070b05'),
  }
}

/**
 * Samples drawn per refresh. The real F3 scope shows a handful of cycles, so
 * the trace is decimated to this many points rather than the analyser's full
 * 1024 — otherwise the waveform is far too dense to read as a wave.
 */
const TRACE_POINTS = 180

export interface RadioScopeProps {
  audioRef: RefObject<HTMLAudioElement | null>
  isPlaying: boolean
  tuning: boolean
  signal: number
}

export function RadioScope({ audioRef, isPlaying, tuning, signal }: RadioScopeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const audio = audioRef.current
    if (!canvas || !audio) return

    const wire = createScopeWire(audio)
    const g = canvas.getContext('2d')
    if (!g) return

    const { color, hot, faint, screen } = theme()
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const time = new Uint8Array(wire ? wire.analyser.fftSize : 0)
    let raf = 0
    let noisePhase = 0

    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr))
      if (canvas.width !== w) {
        canvas.width = w
        g.fillStyle = screen
        g.fillRect(0, 0, w, h)
      }
      if (canvas.height !== h) canvas.height = h
    }

    /** Reset the face to screen black, so the glow passes never smear. */
    const wipe = (width: number, height: number) => {
      g.globalAlpha = 1
      g.fillStyle = screen
      g.fillRect(0, 0, width, height)
    }

    /** Dead frequency: a jittery noise trace drifting across the face. */
    const drawNoise = (now: number) => {
      const { width, height } = canvas
      noisePhase += 0.06
      wipe(width, height)

      g.strokeStyle = faint
      g.lineWidth = Math.max(1, dpr)
      g.beginPath()
      for (let i = 0; i <= TRACE_POINTS; i++) {
        const x = (i / TRACE_POINTS) * width
        const n =
          Math.sin(i * 12.9898 + noisePhase * 7.3) *
          Math.sin(i * 4.1414 + noisePhase * 3.1)
        const y = height / 2 + n * height * 0.16
        if (i === 0) g.moveTo(x, y)
        else g.lineTo(x, y)
      }
      g.stroke()

      // A drifting horizontal carrier line
      g.strokeStyle = color
      g.globalAlpha = 0.16 + 0.06 * Math.sin(now * 0.004)
      g.lineWidth = Math.max(1, dpr)
      g.beginPath()
      const y = height / 2 + Math.sin(now * 0.0016) * height * 0.12
      g.moveTo(0, y)
      g.lineTo(width, y)
      g.stroke()
      g.globalAlpha = 1
    }

    /** No signal: a flat resting trace with a soft, breathing glow. */
    const drawIdle = (now: number) => {
      const { width, height } = canvas
      wipe(width, height)

      g.strokeStyle = color
      g.globalAlpha = 0.3 + 0.1 * Math.sin(now * 0.0025)
      g.lineWidth = Math.max(1, dpr)
      g.beginPath()
      g.moveTo(0, height / 2)
      g.lineTo(width, height / 2)
      g.stroke()
      g.globalAlpha = 1
    }

    /** Live waveform: the whole trace, drawn fresh every frame. */
    const drawWave = () => {
      if (!wire) return
      if (wire.ctx.state === 'suspended') void wire.ctx.resume()
      wire.analyser.getByteTimeDomainData(time)

      const { width, height } = canvas
      const mid = height / 2
      const usable = height / 2 - 2 * dpr
      const step = time.length / TRACE_POINTS

      wipe(width, height)

      // Glow pass, then the crisp line on top: the phosphor look.
      for (const [style, alpha, widthMul] of [
        [faint, 0.9, 5],
        [color, 1, 2.5],
        [hot, 1, 1],
      ] as const) {
        g.strokeStyle = style
        g.globalAlpha = alpha
        g.lineWidth = Math.max(1, dpr * widthMul)
        g.lineJoin = 'round'
        g.beginPath()
        for (let i = 0; i < TRACE_POINTS; i++) {
          const sample = time[Math.min(time.length - 1, Math.floor(i * step))] ?? 128
          // 128 is silence; map it to +/-1 and scale by the signal strength so
          // a weak station draws a visibly smaller wave.
          const amp = ((sample - 128) / 128) * usable * (0.45 + signal * 0.75)
          const x = (i / (TRACE_POINTS - 1)) * width
          const y = mid - amp
          if (i === 0) g.moveTo(x, y)
          else g.lineTo(x, y)
        }
        g.stroke()
      }
      g.globalAlpha = 1
    }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      resize()
      if (tuning) {
        drawNoise(now)
      } else if (isPlaying && signal > 0.02) {
        drawWave()
      } else {
        drawIdle(now)
      }
    }

    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      // Defer: React may be remounting the tab rather than tearing the app
      // down, in which case the context still belongs to the live provider.
      window.setTimeout(() => {
        if (audio.isConnected) return
        if (!wire) return
        try {
          wire.analyser.disconnect()
        } catch {
          /* already gone */
        }
        if (wire.ctx.state !== 'closed') {
          void wire.ctx.close().catch(() => {})
        }
        scopeWires.delete(audio)
      }, 0)
    }
  }, [audioRef, isPlaying, tuning, signal])

  return (
    <div className="scope">
      <span className="scope__label">OSCILOSCOPIO</span>
      <canvas ref={canvasRef} className="scope__canvas" aria-hidden="true" />
      <span className="scope__grid" aria-hidden="true" />
      <span className="scope__scan" aria-hidden="true" />
    </div>
  )
}
