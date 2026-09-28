import { useCallback, useEffect, useRef, useState } from 'react'
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

          <div className="device__plate">
            <span className="device__plate-name">PIP-BOY 3000</span>
            <span className="device__plate-sub">VAULT-TEC · ROBOTRON</span>
          </div>
        </div>

        {/* ---- Fasteners -------------------------------------------------
            Four, seated in the shell's actual corners. There used to be six
            pinned to loose viewport percentages; with the shell no longer
            cropped at -1.5% the extra pair had nothing to sit in. */}
        <span className="device__rivet device__rivet--tl" aria-hidden="true" />
        <span className="device__rivet device__rivet--tr" aria-hidden="true" />
        <span className="device__rivet device__rivet--bl" aria-hidden="true" />
        <span className="device__rivet device__rivet--br" aria-hidden="true" />
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

/** The knob's travel, in degrees. Must match the rotation in the render. */
const SWEEP = 270

/** Shortest signed distance from a to b on the circle, in degrees. */
function angleDelta(from: number, to: number): number {
  let delta = (to - from) % 360
  if (delta > 180) delta -= 360
  if (delta < -180) delta += 360
  return delta
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

function TuneKnob({ value, onChange, label, powered }: TuneKnobProps) {
  const knobRef = useRef<HTMLDivElement | null>(null)
  const drag = useRef<{ angle: number; base: number } | null>(null)
  /**
   * What the knob shows while it is being turned. Null whenever it is idle,
   * at which point the knob reads `value` — which comes from the *station*,
   * not from the pointer.
   *
   * That distinction is the whole fix. The old handler called onChange on
   * every pointermove, and onChange lands on the nearest station and calls
   * tuneTo, which then blocks for TUNE_MS (750ms) while `tuning` is true.
   * Every move in that window was dropped and the knob snapped back to the
   * station, so dragging fought the user. Holding the position locally and
   * committing once on release is also how a detented dial is supposed to
   * behave: you turn it, it snaps to a detent when you let go.
   *
   * Mirrored into a ref because the commit happens in the pointerup handler:
   * reading it out of a setState updater would run onChange during the
   * render phase, and React replays updaters in StrictMode, so a single
   * release would fire tuneTo twice.
   */
  const [dragValue, setDragValue] = useState<number | null>(null)
  const heldValue = useRef<number | null>(null)

  const hold = useCallback((next: number | null) => {
    heldValue.current = next
    setDragValue(next)
  }, [])

  /** Pointer angle around the knob's centre, -180..180. */
  const pointerAngle = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return (
      (Math.atan2(
        event.clientY - (rect.top + rect.height / 2),
        event.clientX - (rect.left + rect.width / 2),
      ) *
        180) /
      Math.PI
    )
  }

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!powered) return
      event.currentTarget.setPointerCapture(event.pointerId)
      drag.current = { angle: pointerAngle(event), base: value }
      hold(value)
    },
    [value, powered, hold],
  )

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const start = drag.current
      if (!start) return
      hold(clamp01(start.base + angleDelta(start.angle, pointerAngle(event)) / SWEEP))
    },
    [hold],
  )

  const endDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const start = drag.current
      drag.current = null
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      if (!start) return
      const current = heldValue.current
      hold(null)
      // Commit once. A tap with no travel steps forward one eighth of the
      // band, so the knob is usable without discovering the drag gesture.
      onChange(current === null ? clamp01(start.base + 1 / 8) : current)
    },
    [onChange, hold],
  )

  // Wheel over the knob steps the band, like a real detented dial. Bound to
  // the ref rather than document.getElementById: the id was a global lookup
  // from inside a component, and it re-ran the effect on every value change.
  useEffect(() => {
    const node = knobRef.current
    if (!node || !powered) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      onChange(clamp01(value + (event.deltaY > 0 ? -0.04 : 0.04)))
    }
    node.addEventListener('wheel', onWheel, { passive: false })
    return () => node.removeEventListener('wheel', onWheel)
  }, [value, onChange, powered])

  const shown = dragValue ?? value
  const angle = -SWEEP / 2 + shown * SWEEP

  return (
    <div className="tune" data-disabled={!powered || undefined}>
      <span className="tune__ink">TUNE</span>

      <div
        ref={knobRef}
        className="tune__knob"
        role="slider"
        tabIndex={0}
        aria-label="Sintonizar radio"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(shown * 100)}
        aria-valuetext={label}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 0.02 : 0.08
          if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
            event.preventDefault()
            onChange(clamp01(value + step))
          } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
            event.preventDefault()
            onChange(clamp01(value - step))
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
