import { useRadio } from './radioContext'
import { RadioScope } from './RadioScope'
import { BAND } from './radioStations'
import './Radio.css'

const TICKS = 21

export function Radio() {
  const {
    stations,
    station,
    stationIndex,
    track,
    trackIndex,
    trackCount,
    hasSignal,
    hasProgramme,
    volume,
    radioOn,
    isPlaying,
    currentTime,
    duration,
    tuning,
    scanFrequency,
    signal,
    audioRef,
    tuneTo,
    tuneBy,
    changeTrack,
    selectTrack,
    togglePower,
    seek,
    changeVolume,
  } = useRadio()

  // A dead frequency, as opposed to a live station with no programme on it.
  // Both are real: the difference is that the dead one is not on the band at
  // all, while ONDA REFUGIO simply carries no music.
  const offAir = !hasSignal
  const readout = tuning ? scanFrequency : station.frequency
  // Where the needle sits across the dial, 0-1.
  const needle = (readout - BAND.min) / (BAND.max - BAND.min)
  // The knob rotates toward the station's slot in the list.
  const knobAngle = stations.length > 1 ? (stationIndex / (stations.length - 1)) * 270 - 135 : 0

  return (
    <div className="radio">
      {/* ================= SINTONIZADOR ================= */}
      <section className="radio__tuner pip-panel" aria-label="Sintonizador">
        <h2 className="pip-label radio__panel-title">SINTONIZADOR</h2>

        <div
          className="dial"
          style={{ ['--needle' as string]: `${needle * 100}%` }}
          role="group"
          aria-label={`Frecuencia ${readout.toFixed(1)} megahercios`}
        >
          <div className="dial__scale" aria-hidden="true">
            {Array.from({ length: TICKS }, (_, i) => (
              <span
                key={i}
                className="dial__tick"
                data-major={i % 5 === 0 || undefined}
                style={{ ['--i' as string]: String(i) }}
              />
            ))}
          </div>

          <div className="dial__knob" style={{ ['--turn' as string]: `${knobAngle}deg` }}>
            <span className="dial__knob-marker" aria-hidden="true" />
          </div>

          <div className="dial__needle" aria-hidden="true" />
        </div>

        <div className="dial__readout">
          <span className="dial__value" data-busy={tuning || undefined}>
            {readout.toFixed(1)}
          </span>
          <span className="dial__unit">MHz FM</span>
        </div>

        <div className="radio__tune-buttons">
          <button
            type="button"
            className="pip-btn radio__tune-btn"
            onClick={() => tuneBy(-1)}
            disabled={tuning}
            aria-label="Emisora anterior"
          >
            <span aria-hidden="true">◀</span> EMISORA
          </button>
          <button
            type="button"
            className="pip-btn radio__tune-btn"
            onClick={() => tuneBy(1)}
            disabled={tuning}
            aria-label="Emisora siguiente"
          >
            EMISORA <span aria-hidden="true">▶</span>
          </button>
        </div>

        <div className="radio__tuner-foot">
          <span className="pip-label">SEÑAL</span>
          <SignalMeter value={signal} />
          <span className="radio__tuner-station">{station.name}</span>
        </div>
      </section>

      {/* ================= OSCILOSCOPIO ================= */}
      <section className="radio__scope pip-panel" aria-label="Osciloscopio y reproducción">
        <header className="nowplaying">
          <div className="nowplaying__text">
            <span className="pip-label">{station.tagline}</span>
            {/* A station with no programme shows its own name: there is no
                track to headline, but there is still a station on the dial. */}
            <h2 className="nowplaying__track">{track?.name ?? station.name}</h2>
            <span className="nowplaying__artist">
              {track?.artist ?? (offAir ? 'FRECUENCIA MUERTA' : 'SIN PROGRAMACIÓN')}
            </span>
          </div>

          <div className="nowplaying__time">
            <span className="nowplaying__elapsed">
              {hasProgramme ? formatTime(currentTime) : '--:--'}
            </span>
            <span className="nowplaying__total">
              / {hasProgramme ? formatTime(duration) : '--:--'}
            </span>
          </div>
        </header>

        <label className="seek">
          <span className="pip-sr">Posición de reproducción</span>
          <input
            type="range"
            min={0}
            max={Math.max(duration, 1)}
            step={0.5}
            value={Math.min(currentTime, Math.max(duration, 1))}
            onChange={(e) => seek(Number(e.target.value))}
            disabled={!hasProgramme || duration === 0}
            aria-valuetext={`${formatTime(currentTime)} de ${formatTime(duration)}`}
          />
        </label>

        <RadioScope
          audioRef={audioRef}
          isPlaying={isPlaying}
          tuning={tuning}
          signal={signal}
        />
      </section>

      {/* ================= EMISORAS ================= */}
      <section className="radio__stations pip-panel" aria-label="Emisoras">
        <div className="radio__list">
          <h3 className="pip-label radio__panel-title">EMISORAS</h3>

          <ul className="stations pip-scroll">
            {stations.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="station"
                  aria-selected={i === stationIndex}
                  onClick={() => tuneTo(i)}
                >
                  <StationTrace strength={s.strength} active={i === stationIndex} />
                  <span className="station__text">
                    <span className="station__freq">{s.frequency.toFixed(1)}</span>
                    <span className="station__name">{s.name}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="radio__list">
          <h3 className="pip-label radio__panel-title">
            {offAir
              ? 'SIN EMISIÓN'
              : hasProgramme
                ? `PISTAS · ${trackIndex + 1}/${trackCount}`
                : 'SIN PROGRAMACIÓN'}
          </h3>

          <ul className="tracks pip-scroll">
            {offAir ? (
              <li className="track track--empty">
                <p className="pip-label">FRECUENCIA MUERTA</p>
                <p className="track__hint">
                  Gira el dial hacia
                  <br />
                  <code>RADIO YERMO</code> o <code>ONDA REFUGIO</code>
                </p>
              </li>
            ) : hasProgramme ? (
              stations[stationIndex].tracks.map((t, i) => (
                <li key={t.url}>
                  <button
                    type="button"
                    className="track"
                    aria-selected={i === trackIndex}
                    onClick={() => selectTrack(i)}
                  >
                    <span className="track__index">{String(i + 1).padStart(2, '0')}</span>
                    <span className="track__text">
                      <span className="track__name">{t.name}</span>
                      <span className="track__artist">{t.artist}</span>
                    </span>
                  </button>
                </li>
              ))
            ) : (
              /* On air, tuned, metered — and deliberately without music. The
                 programme lives on RADIO YERMO. */
              <li className="track track--empty">
                <p className="pip-label">EMISORA MUDO</p>
                <p className="track__hint">
                  ESTA FRECUENCIA NO EMITE
                  <br />
                  MÚSICA · LA DE <code>RADIO YERMO</code>
                </p>
              </li>
            )}
          </ul>
        </div>
      </section>

      {/* ================= TRANSPORTE =================
          The skip buttons walk the current station's playlist. On a station
          with no programme they are simply inert. */}
      <section className="radio__transport pip-panel" aria-label="Controles">
        <div className="radio__group">
          <span className="pip-label">PISTA</span>
          <div className="radio__group-buttons">
            <button
              type="button"
              className="pip-btn radio__skip"
              onClick={() => changeTrack(-1)}
              disabled={!hasProgramme}
              aria-label="Pista anterior"
            >
              <span aria-hidden="true">⏮</span>
            </button>

            <button
              type="button"
              className="pip-btn pip-btn--primary radio__power"
              onClick={togglePower}
              aria-pressed={radioOn}
              disabled={offAir}
            >
              {radioOn ? 'ENCENDIDO' : 'APAGADO'}
            </button>

            <button
              type="button"
              className="pip-btn radio__skip"
              onClick={() => changeTrack(1)}
              disabled={!hasProgramme}
              aria-label="Pista siguiente"
            >
              <span aria-hidden="true">⏭</span>
            </button>
          </div>
        </div>

        <label className="radio__group volume">
          <span className="pip-label">VOLUMEN</span>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => changeVolume(Number(e.target.value))}
            aria-valuetext={`${volume} por ciento`}
          />
          <span className="volume__value">{volume}%</span>
        </label>
      </section>

      {tuning && (
        <div className="radio__scanning" role="status">
          <span className="radio__scanning-text">SINTONIZANDO…</span>
        </div>
      )}
    </div>
  )
}

/**
 * Station strength, drawn as a scope trace instead of a bar meter: a dead
 * frequency is a flat line, a strong one draws a tall, live-looking waveform.
 */
function StationTrace({ strength, active }: { strength: number; active: boolean }) {
  const points: string[] = []
  const steps = 12
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * 100
    // A couple of harmonics so it doesn't read as a plain sine.
    const y =
      50 -
      (Math.sin(i * 1.1) * 0.6 + Math.sin(i * 2.7) * 0.4) *
        strength *
        38
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`)
  }

  return (
    <svg
      className="station__scope"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <line
        className="station__scope-axis"
        x1="0"
        y1="50"
        x2="100"
        y2="50"
      />
      <polyline className="station__scope-trace" points={points.join(' ')} data-active={active || undefined} />
    </svg>
  )
}

/** Four-segment VU meter, phosphor green up to the last bar. */
function SignalMeter({ value }: { value: number }) {
  const lit = Math.round(value * 4)
  return (
    <span className="signal" role="img" aria-label={`Señal ${Math.round(value * 100)} por ciento`}>
      {Array.from({ length: 4 }, (_, i) => (
        <i key={i} data-on={i < lit || undefined} data-peak={i === 3 || undefined} />
      ))}
    </span>
  )
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
