import { useCallback, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

export interface DeviceStat {
  id: string
  value: number
}

export interface DeviceProps {
  children?: ReactNode

  /** Module labels silkscreened on the right panel, in order. */
  tabs: readonly string[]
  activeTab: string
  onSelectTab: (tab: string) => void

  /** Drives the RADS gauge, which selects a S.P.E.C.I.A.L. stat. */
  stats: readonly DeviceStat[]
  activeStat: string
  onSelectStat: (id: string) => void

  /** Drives the TUNE knob. 0-1 across the FM band. */
  tune: number
  onTune: (value: number) => void
  tuneLabel: string

  powered: boolean
  onPowerToggle: () => void
}

/** RADS scale printed on the gauge face. */
const RADS_TICKS = [100, 200, 300, 400, 500, 600] as const

/**
 * The Pip-Boy 3000, modelled on the iconic in-game render: a big off-centre
 * screen in a thick black bezel, a right-hand control panel with the module
 * labels silkscreened beside the RADS gauge and the TUNE knob, and a bottom
 * deck with the speaker grille, hazard stripe and power lamp.
 *
 * Everything is CSS/SVG — no image assets. The whole thing bleeds off the
 * viewport so the screen is as large as it can be.
 */
export function Device({
  children,
  tabs,
  activeTab,
  onSelectTab,
  stats,
  activeStat,
  onSelectStat,
  tune,
  onTune,
  tuneLabel,
  powered,
  onPowerToggle,
}: DeviceProps) {
  return (
    <div className="device">
      <div className="device__case" data-power={powered ? undefined : 'off'}>
        {/* ================= SCREEN ================= */}
        <div className="device__screen">
          <div className="device__bezel">
            <span className="device__bezel-notch" aria-hidden="true" />
            <div className="device__glass">{children}</div>
            <span className="device__brand" aria-hidden="true">
              ROBCO
            </span>
          </div>
        </div>

        {/* ================= RIGHT CONTROL PANEL ================= */}
        <div className="device__panel">
          <nav className="device__labels" aria-label="Módulos">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                className="device__label"
                aria-pressed={tab === activeTab}
                onClick={() => onSelectTab(tab)}
              >
                <span className="device__label-ink" aria-hidden="true" />
                {tab}
              </button>
            ))}
          </nav>

          <RadsGauge
            stats={stats}
            active={activeStat}
            onSelect={onSelectStat}
            powered={powered}
          />

          <TuneKnob
            value={tune}
            onChange={onTune}
            label={tuneLabel}
            powered={powered}
          />

          <div className="device__vents" aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} />
            ))}
          </div>
        </div>

        {/* ================= BOTTOM DECK ================= */}
        <div className="device__deck">
          <div className="device__grille" aria-hidden="true">
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} />
            ))}
          </div>

          <button
            type="button"
            className="device__power"
            onClick={onPowerToggle}
            aria-pressed={powered}
            aria-label={powered ? 'Apagar dispositivo' : 'Encender dispositivo'}
          >
            <span className="device__power-lamp" aria-hidden="true" />
            <span className="device__power-ink">POWER</span>
          </button>

          <div className="device__hazard" aria-hidden="true" />

          <div className="device__plate">
            <span className="device__plate-name">PIP-BOY 3000</span>
            <span className="device__plate-sub">VAULT-TEC · ROBOTRON</span>
          </div>
        </div>

        {/* ---- Fasteners ------------------------------------------------- */}
        <span className="device__rivet device__rivet--tl" aria-hidden="true" />
        <span className="device__rivet device__rivet--tr" aria-hidden="true" />
        <span className="device__rivet device__rivet--bl" aria-hidden="true" />
        <span className="device__rivet device__rivet--br" aria-hidden="true" />
        <span className="device__rivet device__rivet--bl2" aria-hidden="true" />
        <span className="device__rivet device__rivet--br2" aria-hidden="true" />
      </div>
    </div>
  )
}

/* ==========================================================================
   RADS GAUGE — semicircular, selects a S.P.E.C.I.A.L. stat
   ========================================================================== */

interface RadsGaugeProps {
  stats: readonly DeviceStat[]
  active: string
  onSelect: (id: string) => void
  powered: boolean
}

function RadsGauge({ stats, active, onSelect, powered }: RadsGaugeProps) {
  const index = Math.max(
    0,
    stats.findIndex((s) => s.id === active),
  )
  // 0-1 position, biased so the needle sweeps a shallow arc like the real one.
  const position = stats.length > 1 ? index / (stats.length - 1) : 0
  const angle = -72 + position * 144

  const step = (delta: number) => {
    const next = (index + delta + stats.length) % stats.length
    onSelect(stats[next].id)
  }

  return (
    <div className="rads" data-disabled={!powered || undefined}>
      <span className="rads__ink">RADS</span>

      <div
        className="rads__dial"
        role="slider"
        tabIndex={0}
        aria-label="Seleccionar estadística"
        aria-valuemin={1}
        aria-valuemax={stats.length}
        aria-valuenow={index + 1}
        aria-valuetext={stats[index]?.id}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
            event.preventDefault()
            step(1)
          } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
            event.preventDefault()
            step(-1)
          }
        }}
        onClick={() => step(1)}
      >
        <span className="rads__face" aria-hidden="true">
          {RADS_TICKS.map((tick, i) => (
            <span
              key={tick}
              className="rads__tick"
              data-danger={i >= 4 || undefined}
              style={{ ['--t' as string]: String(i) }}
            >
              {tick}
            </span>
          ))}
          <span className="rads__arc" aria-hidden="true" />
        </span>

        <span
          className="rads__needle"
          style={{ ['--angle' as string]: `${angle}deg` }}
          aria-hidden="true"
        />
        <span className="rads__hub" aria-hidden="true" />
      </div>

      <span className="rads__readout" aria-hidden="true">
        {stats[index]?.id}
      </span>
    </div>
  )
}

/* ==========================================================================
   TUNE KNOB — star knob with an FM arc, changes radio station
   ========================================================================== */

interface TuneKnobProps {
  value: number
  onChange: (value: number) => void
  label: string
  powered: boolean
}

function TuneKnob({ value, onChange, label, powered }: TuneKnobProps) {
  const drag = useRef<{ x: number; y: number; base: number } | null>(null)

  // Drag horizontally to sweep the band: simple, predictable, and works with
  // a mouse, a trackpad or a finger.
  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!powered) return
      drag.current = { x: event.clientX, y: event.clientY, base: value }
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [value, powered],
  )

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const start = drag.current
      if (!start) return
      const delta = (event.clientX - start.x) / 220
      onChange(Math.max(0, Math.min(1, start.base + delta)))
    },
    [onChange],
  )

  const endDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    drag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }, [])

  // Wheel over the knob steps the band, like a real detented dial.
  useEffect(() => {
    const node = document.getElementById('tune-knob')
    if (!node) return
    const onWheel = (event: WheelEvent) => {
      if (!powered) return
      event.preventDefault()
      const next = value + (event.deltaY > 0 ? -0.04 : 0.04)
      onChange(Math.max(0, Math.min(1, next)))
    }
    node.addEventListener('wheel', onWheel, { passive: false })
    return () => node.removeEventListener('wheel', onWheel)
  }, [value, onChange, powered])

  const angle = -135 + value * 270

  return (
    <div className="tune" data-disabled={!powered || undefined}>
      <span className="tune__ink">TUNE</span>

      <div
        id="tune-knob"
        className="tune__knob"
        role="slider"
        tabIndex={0}
        aria-label="Sintonizar radio"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        aria-valuetext={label}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 0.02 : 0.08
          if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
            event.preventDefault()
            onChange(Math.min(1, value + step))
          } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
            event.preventDefault()
            onChange(Math.max(0, value - step))
          }
        }}
      >
        <span className="tune__arc" aria-hidden="true">
          {Array.from({ length: 13 }, (_, i) => (
            <span
              key={i}
              className="tune__notch"
              data-major={i % 3 === 0 || undefined}
              style={{ ['--i' as string]: String(i) }}
            />
          ))}
        </span>
        <span
          className="tune__body"
          style={{ ['--turn' as string]: `${angle}deg` }}
          aria-hidden="true"
        >
          <span className="tune__grip" />
        </span>
      </div>

      <span className="tune__readout">{label}</span>
    </div>
  )
}
