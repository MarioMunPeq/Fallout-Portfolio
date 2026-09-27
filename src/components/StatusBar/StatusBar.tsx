import type { ReactNode } from 'react'
import './StatusBar.css'

export interface StatusBarProps {
  hp: number
  hpMax: number
  level: number
  xp: number
  xpForNext: number
  ap: number
  apMax: number
  /** Right-aligned context, e.g. the current tab's subtitle. */
  slot?: ReactNode
}

/**
 * Persistent device status bar. This used to live inside StatusView only, so
 * HP/LEVEL/AP vanished the moment you left the STAT tab — the device read as
 * six separate webpages instead of one machine.
 */
export function StatusBar({
  hp,
  hpMax,
  level,
  xp,
  xpForNext,
  ap,
  apMax,
  slot,
}: StatusBarProps) {
  // No state: the fill width is a plain style and the CSS transition animates
  // it. Mirroring the value into state just to trigger a render was a
  // setState-in-effect cascade for nothing.
  return (
    <footer className="statusbar">
      <Gauge
        label="HP"
        value={`${hp}/${hpMax}`}
        pct={(hp / hpMax) * 100}
        variant={hp / hpMax <= 0.25 ? 'critical' : 'ok'}
      />
      <Gauge
        label="NIVEL"
        value={String(level)}
        pct={(xp / xpForNext) * 100}
        variant="xp"
      />
      <Gauge
        label="AP"
        value={`${ap}/${apMax}`}
        pct={(ap / apMax) * 100}
        variant="ok"
      />
      <div className="statusbar__slot">{slot}</div>
    </footer>
  )
}

interface GaugeProps {
  label: string
  value: string
  pct: number
  variant: 'ok' | 'critical' | 'xp'
}

function Gauge({ label, value, pct, variant }: GaugeProps) {
  const clamped = Math.max(0, Math.min(100, pct))

  return (
    <div className="statusbar__gauge" data-variant={variant}>
      <span className="statusbar__label">{label}</span>
      <span className="statusbar__track">
        {/* segmented fill: reads as a mechanical bar gauge, not a CSS progress bar */}
        <span className="statusbar__fill" style={{ width: `${clamped}%` }} />
      </span>
      <span className="statusbar__value">{value}</span>
    </div>
  )
}
