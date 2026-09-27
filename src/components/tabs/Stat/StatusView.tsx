import { useCallback } from 'react'
import { SPECIAL_STATS, CONDITIONS, OPERATOR } from '../../../data/operator'
import type { StatId } from '../../../data/operator'
import { playSfx } from '../../../utils/sfx'
import statSelectSfx from '../../../assets/sfx/dial_move.ogg'
import { SpriteLoop } from '../../SpriteLoop/SpriteLoop'
import './StatusView.css'

/* ---- S.P.E.C.I.A.L. lamp sprites -----------------------------------------
   `import.meta.glob` is resolved at build time and BOTH of its arguments must
   be literals: the pattern cannot be a variable or template literal, and the
   options object cannot be a shared identifier. So every stat gets its own
   fully written-out call.

   The dumped frame counts are inconsistent between stats (6 for STR, 12 for
   INT, 16 for LCK), so the frame index is clamped to whatever actually
   shipped rather than rendering a broken image. */
function framesFromGlob(modules: Record<string, string>): string[] {
  return Object.entries(modules)
    .map(([path, source]) => ({
      source,
      index: Number(path.match(/(\d+)\.[a-zA-Z]+$/)?.[1] ?? 0),
    }))
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.source)
}

const PHOSPHOR = '#9ece6a'

function toPhosphorSvg(raw: string): string {
  const tinted = raw
    .replace(/fill\s*[:=]\s*["']?#(?:fff|ffffff)["']?/gi, `fill="${PHOSPHOR}"`)
    .replace(/stroke\s*[:=]\s*["']?#(?:fff|ffffff)["']?/gi, `stroke="${PHOSPHOR}"`)
  return `data:image/svg+xml;utf8,${encodeURIComponent(tinted)}`
}

function tint(modules: Record<string, string>): string[] {
  return framesFromGlob(modules).map(toPhosphorSvg)
}

const LAMPS: Record<StatId, string[]> = {
  STR: tint(
    import.meta.glob<string>(
      '../../../assets/images/stats/special/strength/*.svg',
      { eager: true, query: '?raw', import: 'default' },
    ),
  ),
  PER: tint(
    import.meta.glob<string>(
      '../../../assets/images/stats/special/perception/*.svg',
      { eager: true, query: '?raw', import: 'default' },
    ),
  ),
  END: tint(
    import.meta.glob<string>(
      '../../../assets/images/stats/special/endurance/*.svg',
      { eager: true, query: '?raw', import: 'default' },
    ),
  ),
  CHR: tint(
    import.meta.glob<string>(
      '../../../assets/images/stats/special/charisma/*.svg',
      { eager: true, query: '?raw', import: 'default' },
    ),
  ),
  INT: tint(
    import.meta.glob<string>(
      '../../../assets/images/stats/special/intelligence/*.svg',
      { eager: true, query: '?raw', import: 'default' },
    ),
  ),
  AGL: tint(
    import.meta.glob<string>(
      '../../../assets/images/stats/special/agility/*.svg',
      { eager: true, query: '?raw', import: 'default' },
    ),
  ),
  LCK: tint(
    import.meta.glob<string>(
      '../../../assets/images/stats/special/luck/*.svg',
      { eager: true, query: '?raw', import: 'default' },
    ),
  ),
}

/** Per-stat flavour text shown in the readout when a stat is selected. */
const STAT_READOUT: Record<StatId, string> = {
  STR: 'Capacidad de arrastre y daño cuerpo a cuerpo. Sube el peso que llevas encima.',
  PER: 'Precisión a distancia. Afecta a las armas de fuego y al reconocimiento.',
  END: 'Aguante físico. Reduce el daño recibido y frena la radiación.',
  CHR: 'Influencia sobre las personas. Desbloquea mejores interacciones.',
  INT: 'Conocimiento técnico. Es tu estadística principal: todo lo demás se apoya aquí.',
  AGL: 'Reflejos y sigilo. Controlas mejor los ataques sorpresa.',
  LCK: 'Azar puro. Decide con qué frecuencia sale bien una situación arriesgada.',
}

/**
 * Conditions glyphs. Drawn as inline SVG rather than pulled from the extracted
 * PNGs: those are 6x11 to 12x11 pixels, far too small to render at UI size
 * without turning to mush, and masking them produced solid blocks.
 *
 * Several subpaths per glyph, all drawn on the same 24x24 grid and filled with
 * `currentColor` so they tint with the phosphor.
 */
function ConditionIcon({ id }: { id: string }) {
  const paths = CONDITION_PATHS[id]
  if (!paths) return null
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}

const CONDITION_PATHS: Record<string, readonly string[]> = {
  // A 9mm cartridge: ogive tip over a shouldered case and rim. The previous
  // glyph was a side-on rifle, which read as a blob at 40px.
  ammo: [
    'M12 1.5c2.2 0 4 1.9 4 4.2V11H8V5.7c0-2.3 1.8-4.2 4-4.2z',
    'M7.5 12h9v7h1.2v2.5H6.3V19h1.2z',
  ],
  // A shield, for armour
  armor: [
    'M12 2l9 3.2v6.3c0 5.4-3.8 9.7-9 11-5.2-1.3-9-5.6-9-11V5.2L12 2zm0 2.3L5 6.9v4.6c0 4.3 2.9 7.7 7 8.9 4.1-1.2 7-4.6 7-8.9V6.9l-7-2.6z',
  ],
  // Radioactive trefoil, from Tabler Icons "radioactive" (filled, MIT).
  radiation: [
    'M21 11a1 1 0 0 1 1 1a10 10 0 0 1 -5 8.656a1 1 0 0 1 -1.302 -.268l-.064 -.098l-3 -5.19a.995 .995 0 0 1 -.133 -.542l.01 -.11l.023 -.106l.034 -.106l.046 -.1l.056 -.094l.067 -.089a.994 .994 0 0 1 .165 -.155l.098 -.064a2 2 0 0 0 .993 -1.57l.007 -.163a1 1 0 0 1 .883 -.994l.117 -.007h6z',
    'M7 3.344a10 10 0 0 1 10 0a1 1 0 0 1 .418 1.262l-.052 .104l-3 5.19l-.064 .098a.994 .994 0 0 1 -.155 .165l-.089 .067a1 1 0 0 1 -.195 .102l-.105 .034l-.107 .022a1.003 1.003 0 0 1 -.547 -.07l-.104 -.052a2 2 0 0 0 -1.842 -.082l-.158 .082a1 1 0 0 1 -1.302 -.268l-.064 -.098l-3 -5.19a1 1 0 0 1 .366 -1.366z',
    'M9 11a1 1 0 0 1 .993 .884l.007 .117a2 2 0 0 0 .861 1.645l.237 .152a.994 .994 0 0 1 .165 .155l.067 .089l.056 .095l.045 .099c.014 .036 .026 .07 .035 .106l.022 .107l.011 .11a.994 .994 0 0 1 -.08 .437l-.053 .104l-3 5.19a1 1 0 0 1 -1.366 .366a10 10 0 0 1 -5 -8.656a1 1 0 0 1 .883 -.993l.117 -.007h6z',
  ],
  // A helmet
  helmet: [
    'M12 2a9 9 0 00-9 9v6a2 2 0 002 2h2v-3H4v-5a8 8 0 0116 0v5h-3v3h2a2 2 0 002-2v-6a9 9 0 00-9-9zm-3 8h6v2H9v-2zm0 4h6v2H9v-2z',
  ],
}

export interface StatusViewProps {
  /** Which S.P.E.C.I.A.L. stat is selected — driven by the case's RADS dial. */
  selectedStat: StatId
  onSelectStat: (id: StatId) => void
}

export function StatusView({
  selectedStat,
  onSelectStat,
}: StatusViewProps) {
  const select = useCallback(
    (id: StatId) => {
      onSelectStat(id)
      playSfx(statSelectSfx)
    },
    [onSelectStat],
  )

  const selected = SPECIAL_STATS.some((s) => s.id === selectedStat)
    ? selectedStat
    : 'INT'
  const active = SPECIAL_STATS.find((s) => s.id === selected) ?? SPECIAL_STATS[0]

  return (
    <div className="status">
      {/* ---- Identity -------------------------------------------------- */}
      <header className="status__header">
        <span className="status__portrait" aria-hidden="true" />
        <div className="status__identity">
          <h1 className="status__name">{OPERATOR.name}</h1>
          <p className="status__class">
            <span className="status__class-key">CLASE</span>
            {OPERATOR.role}
          </p>
        </div>
      </header>

      {/* ---- S.P.E.C.I.A.L. -------------------------------------------- */}
      <section className="status__special" aria-label="S.P.E.C.I.A.L.">
        <h2 className="status__section-title">S.P.E.C.I.A.L.</h2>

        <div className="special-grid" role="group">
          {SPECIAL_STATS.map((stat) => {
            const isActive = stat.id === selected
            const frames = LAMPS[stat.id] ?? []
            return (
              <button
                key={stat.id}
                type="button"
                className="special-cell"
                aria-pressed={isActive}
                onClick={() => select(stat.id)}
              >
                <span className="special-cell__letter">{stat.id}</span>

                {/* Animated lamp: starts on the frame matching the value, then
                    plays on, the way the real device flickers. */}
                <span className="special-cell__lamp">
                  <SpriteLoop
                    frames={frames}
                    startFrame={Math.min(stat.value, Math.max(0, frames.length - 1))}
                    frameIntervalMs={180}
                  />
                </span>

                <span className="special-cell__value">{stat.value}</span>
                <span className="special-cell__tag">{stat.detail}</span>

                <span className="special-cell__pips" aria-hidden="true">
                  {Array.from({ length: 10 }, (_, i) => (
                    <i key={i} data-on={i < stat.value || undefined} />
                  ))}
                </span>
                <span className="pip-sr">
                  {stat.id}: {stat.value} de 10
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* ---- Readout + conditions --------------------------------------- */}
      <div className="status__lower">
        <section className="status__readout pip-panel" aria-live="polite">
          <h3 className="pip-label">
            {active.id} · {active.detail}
          </h3>
          <p className="status__readout-body">{STAT_READOUT[active.id]}</p>
          <dl className="status__facts">
            <div>
              <dt className="pip-label">ORIGEN</dt>
              <dd>{OPERATOR.origin}</dd>
            </div>
            <div>
              <dt className="pip-label">EMPLEADOR</dt>
              <dd>{OPERATOR.employer}</dd>
            </div>
            <div>
              <dt className="pip-label">NIVEL</dt>
              <dd>{OPERATOR.level}</dd>
            </div>
          </dl>
        </section>

        <section className="status__conditions" aria-label="Estado">
          <h3 className="pip-label">ESTADO</h3>
          <ul className="conditions">
            {CONDITIONS.map((condition) => (
              <li
                key={condition.id}
                className="condition"
                data-empty={condition.empty || undefined}
                data-warn={
                  (condition.id === 'radiation' && OPERATOR.radiation > 50) ||
                  undefined
                }
              >
                <span className="condition__icon">
                  <ConditionIcon id={condition.id} />
                </span>
                <span className="condition__label">{condition.label}</span>
                <span className="condition__value">{condition.value}</span>
                <span className="condition__track" aria-hidden="true">
                  <span
                    className="condition__fill"
                    style={{ width: `${condition.pct}%` }}
                  />
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
