import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, RefObject } from 'react'
import { TabNav } from '../../TabNav/TabNav'
import submoduleChangeSfx from '../../../assets/sfx/submodule_change.ogg'
import clickSfx from '../../../assets/sfx/mechanical-click.wav'
import okSfx from '../../../assets/sfx/UI_Pipboy_OK.ogg'
import dudSfx from '../../../assets/sfx/computer-beep.wav'
import restartSfx from '../../../assets/sfx/toggle-switch.mp3'
import { playSfx } from '../../../utils/sfx'
import {
  DEFAULT_COLS,
  DEFAULT_ROWS,
  DIFFICULTIES,
  LOCKOUT_SECONDS,
  clearMarks,
  confirmedSlots,
  createGame,
  guessesAllowed,
  triggerDud,
  tryWord,
} from './hackGame'
import type { Game, Group, Line } from './hackGame'
import type { DifficultyId } from './hackTypes'
import type { WordBuckets } from './words'
import { loadDictionary } from './words'
import './HackView.css'

const DIFFICULTY_LABELS = DIFFICULTIES.map((d) => d.label)
const BOOT_TEXT =
  'ROBCO INDUSTRIES (TM) TERMLINK PROTOCOL\nCONTRASEÑA REQUERIDA'
const PROBE_TEXT = 'MMMMMMMMMMMM'

/** Terminal flavour text, revealed when you crack it. */
const VAULT_PAYLOAD = [
  '>ACCESO CONCEDIDO',
  '>DESCIFRANDO…',
  '',
  '  ┌──────────────────────────────────┐',
  '  │  VAULT-TEC · REGISTRO PÚBLICO 9  │',
  '  └──────────────────────────────────┘',
  '',
  '  ESTE DISPOSITIVO NO ES UNA PÁGINA WEB.',
  '',
  '  ES UN PIP-BOY 3000. LO QUE ESTÁS LEYENDO',
  '  ES UN TERMINAL QUE FUNCIONA DE VERDAD:',
  '  LA RADIO SUENA, EL MAPA RESPONDE Y EL',
  '  MINIJUEGO DE HACKEO ES JUGABLE.',
  '',
  '  MARIO MUÑOZ PEQUEÑO · VALLADOLID, ES',
  '  PEGA DEVELOPER @ COGNIZANT',
  '',
  '  20 REPOSITORIOS · 5 PORTEFOLIOS · 1 BÚSQUEDA',
  '  DE UN DISPOSITIVO QUE NO EXISTE.',
  '',
  '>SESIÓN CERRADA. BUENA SUERTE EN LA BÚSQUEDA.',
]

interface BoardSize {
  cols: number
  rows: number
}

/* ==========================================================================
   SHELL — dictionary, boot text, measurement, difficulty
   ========================================================================== */

export function HackView() {
  const [difficultyId, setDifficultyId] = useState<DifficultyId>('novato')
  const [buckets, setBuckets] = useState<WordBuckets | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [bootChars, setBootChars] = useState(0)
  // Starts at the defaults rather than null on purpose: HackGame has to
  // render for `.term__memory` to exist, and `.term__memory` is what we
  // measure. Gating the render on the measurement deadlocked the tab.
  // The real size lands a frame later and triggers one clean remount.
  const [size, setSize] = useState<BoardSize>({
    cols: DEFAULT_COLS,
    rows: DEFAULT_ROWS,
  })

  const memoryRef = useRef<HTMLDivElement | null>(null)
  const booted = bootChars >= BOOT_TEXT.length

  /* ---- Dictionary -------------------------------------------------------- */
  const retry = useCallback(() => {
    setLoadFailed(false)
    loadDictionary()
      .then(setBuckets)
      .catch(() => setLoadFailed(true))
  }, [])

  useEffect(() => {
    let cancelled = false
    loadDictionary()
      .then((loaded) => {
        if (!cancelled) setBuckets(loaded)
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  /* ---- Boot text --------------------------------------------------------- */
  useEffect(() => {
    if (booted) return
    const step = Math.max(1, Math.ceil(BOOT_TEXT.length / 70))
    const id = window.setInterval(() => {
      setBootChars((previous) => {
        const next = Math.min(previous + step, BOOT_TEXT.length)
        if (next >= BOOT_TEXT.length) window.clearInterval(id)
        return next
      })
    }, 16)
    return () => window.clearInterval(id)
  }, [booted])

  /* ---- Measure the board -------------------------------------------------
     getBoundingClientRect, not offsetWidth: offsetWidth is rounded to an
     integer, which drifted the column count by a character or two. */
  useEffect(() => {
    if (!booted) return
    const element = memoryRef.current
    if (!element) return

    const run = () => {
      const probe = element.querySelector<HTMLSpanElement>('.term__probe')
      if (!probe) return
      const style = window.getComputedStyle(element)
      const charWidth = probe.getBoundingClientRect().width / PROBE_TEXT.length
      const lineHeight =
        parseFloat(style.lineHeight) || parseFloat(style.fontSize) || 16
      if (charWidth <= 0 || lineHeight <= 0) return

      const next: BoardSize = {
        // No MIN_COLS floor: forcing a minimum here used to generate a board
        // wider than the container, which then clipped silently.
        cols: Math.max(24, Math.floor(element.clientWidth / charWidth)),
        rows: Math.max(6, Math.floor(element.clientHeight / lineHeight)),
      }
      // Bail on no-op measurements, otherwise the observer would rebuild the
      // board on every tick and throw away the player's progress.
      setSize((current) =>
        current && current.cols === next.cols && current.rows === next.rows
          ? current
          : next,
      )
    }

    // Let layout settle for a frame before the first measurement.
    const raf = requestAnimationFrame(run)
    const observer = new ResizeObserver(run)
    observer.observe(element)
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
    // size is a dependency so the observer is re-attached to the fresh
    // `.term__memory` that each remount produces. Re-measuring to the same
    // value is a no-op, so this can't loop.
  }, [booted, size.cols, size.rows])

  /* ---- Render ------------------------------------------------------------ */
  if (loadFailed) {
    return (
      <div className="hack hack--status">
        <p>ERROR: NO SE PUDO LEER EL DICCIONARIO</p>
        <button type="button" className="pip-btn" onClick={retry}>
          REINTENTAR
        </button>
      </div>
    )
  }

  if (!buckets) {
    return (
      <div className="hack hack--status">
        <p className="pip-blink">INICIANDO TERMINAL…</p>
      </div>
    )
  }

  return (
    <div className="hack">
      <TabNav
        tabs={DIFFICULTY_LABELS}
        activeTab={
          DIFFICULTIES.find((d) => d.id === difficultyId)?.label ??
          DIFFICULTY_LABELS[0]
        }
        onSelect={(label) => {
          const next = DIFFICULTIES.find((d) => d.label === label)
          if (next) setDifficultyId(next.id)
        }}
        label="Dificultad"
        confirmSfx={submoduleChangeSfx}
        variant="secondary"
      />

      <div className="term">
        {!booted ? (
          <pre className="term__boot term__boot--solo">
            {BOOT_TEXT.slice(0, bootChars)}
            <span className="term__cursor" aria-hidden="true" />
          </pre>
        ) : (
          // Remounting on this key is what regenerates the board: a clean
          // state initializer, no setState-in-effect cascade.
          <HackGame
            key={`${difficultyId}:${size.cols}x${size.rows}`}
            difficultyId={difficultyId}
            buckets={buckets}
            cols={size.cols}
            rows={size.rows}
            memoryRef={memoryRef}
          />
        )}
      </div>
    </div>
  )
}

/* ==========================================================================
   GAME — owns the round. Remounts whenever difficulty or board size change.
   ========================================================================== */

interface HackGameProps {
  difficultyId: DifficultyId
  buckets: WordBuckets
  cols: number
  rows: number
  memoryRef: RefObject<HTMLDivElement | null>
}

function HackGame({ difficultyId, buckets, cols, rows, memoryRef }: HackGameProps) {
  const [game, setGame] = useState<Game>(() =>
    createGame(difficultyId, buckets, cols, rows),
  )
  /** Ticking clock, only used to derive the lockout countdown. */
  const [now, setNow] = useState(() => Date.now())

  /* ---- Success delay ------------------------------------------------------ */
  useEffect(() => {
    if (game.phase !== 'accessing') return
    const id = window.setTimeout(() => {
      setGame((current) =>
        current.phase === 'accessing' ? { ...current, phase: 'success' } : current,
      )
    }, 1700)
    return () => window.clearTimeout(id)
  }, [game.phase])

  /* ---- Lockout ------------------------------------------------------------
      Kept as a phase, but nothing can reach it any more: the guess budget is
      the number of decoys on the board, so it never runs out before the
      password does. The reset below is the insurance policy for that claim —
      if the budget ever does run dry, the terminal reopens with a fresh
      password instead of a board of words the player can no longer try. */
  const lockedUntil = game.lockedAt === null ? 0 : game.lockedAt + LOCKOUT_SECONDS * 1000
  const lockout =
    game.lockedAt === null
      ? 0
      : Math.max(0, Math.ceil((lockedUntil - now) / 1000))

  useEffect(() => {
    if (game.phase !== 'locked' || game.lockedAt === null) return

    const expires = game.lockedAt + LOCKOUT_SECONDS * 1000
    const id = window.setInterval(() => {
      const time = Date.now()
      setNow(time)
      if (time < expires) return

      window.clearInterval(id)
      setGame((current) =>
        current.phase === 'locked'
          ? {
              ...current,
              phase: 'playing',
              attemptsUsed: 0,
              // A full reset must also drop the confirmed letters and the
              // spent words, or the player gets a fresh budget against a board
              // that is already half-solved and half ruled out — and the
              // password is no longer a secret.
              locked: new Set<number>(),
              trial: Array.from({ length: current.wordLen }, () => null),
              trialWord: null,
              tried: new Set<number>(),
              rejected: new Set<number>(),
              lockedAt: null,
              log: [
                '>DESBLOQUEO AUTOMATICO',
                '>CONTRASENA CAMBIADA',
                `>PRUEBAS RESTAURADAS: ${guessesAllowed(current.difficulty)}`,
              ],
            }
          : current,
      )
    }, 250)

    return () => window.clearInterval(id)
  }, [game.phase, game.lockedAt])

  /* ---- Actions ------------------------------------------------------------ */
  const restart = useCallback(() => {
    playSfx(restartSfx)
    setGame(createGame(difficultyId, buckets, cols, rows))
  }, [difficultyId, buckets, cols, rows])

  /**
   * Aiming at a candidate word and pressing it is the whole guess. There is no
   * letter-by-letter assembly and no DESCIFRAR step left: the word is grouped
   * by the board, the click scores it, and the strip above shows the result.
   */
  const handleTryWord = useCallback((wordIndex: number) => {
    setGame((current) => {
      if (current.phase !== 'playing') return current
      if (current.tried.has(wordIndex)) return current

      const { game: next, outcome } = tryWord(current, wordIndex)
      if (!outcome) return current

      if (outcome.kind === 'success') playSfx(okSfx)
      else playSfx(clickSfx)
      return next
    })
  }, [])

  const handleDud = useCallback((dudId: string) => {
    setGame((current) => {
      if (current.phase !== 'playing') return current
      const { game: next, outcome } = triggerDud(current, dudId)
      if (!outcome) return current
      playSfx(dudSfx)
      return next
    })
  }, [])

  const handleClearMarks = useCallback(() => {
    setGame((current) => {
      const next = clearMarks(current)
      if (next === current) return current
      playSfx(clickSfx)
      return next
    })
  }, [])

  /* ---- Keyboard ------------------------------------------------------------
      The board is buttons, so Tab, Enter and Space all work natively on a
      candidate word. The terminal only adds the two verbs the board cannot
      express: clear the red marks and start a new password. */
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (game.phase !== 'playing') return

    switch (event.key) {
      case 'n':
      case 'N':
        event.preventDefault()
        restart()
        break
      case 'Backspace': {
        event.preventDefault()
        handleClearMarks()
        break
      }
    }
  }

  const allowed = guessesAllowed(game.difficulty)
  const remaining = allowed - game.attemptsUsed
  const confirmed = confirmedSlots(game)

  return (
    <div className="term__inner" onKeyDown={handleKeyDown}>
      <div className="term__head">
        <span>ROBCO TERMLINK v2.7</span>
        <span>
          {game.difficulty.label} · {game.wordLen} CAR.
        </span>
      </div>

      <div className="term__bar">
        <span className="term__attempts">
          {'>'}PRUEBAS: {remaining}/{allowed}
        </span>
        <span className="term__blocks" aria-hidden="true">
          {Array.from({ length: allowed }, (_, i) => (
            <i key={i} data-on={i < remaining || undefined} />
          ))}
        </span>
        <span className="term__progress">
          CLAVE {game.wordLen} · {confirmed} FIJAS
        </span>
      </div>

      {/* The word on trial. FNV shows it one position at a time, with the
          confirmed letters lit and the last guess's misses in red. It is the
          only place the player can read the result back, so it gets its own
          row above the board. */}
      <div className="term__slots" aria-live="polite">
        <span className="term__slots-caret" aria-hidden="true">
          {'>'}
        </span>
        {game.trial.map((cell, slot) => (
          <span
            key={slot}
            className="term__slot"
            data-state={
              cell === null
                ? 'empty'
                : game.locked.has(slot)
                  ? 'locked'
                  : game.rejected.has(slot)
                    ? 'rejected'
                    : 'picked'
            }
          >
            {cell?.char ?? '·'}
          </span>
        ))}
        <button
          type="button"
          className="pip-btn term__clear"
          onClick={handleClearMarks}
          disabled={game.rejected.size === 0}
        >
          LIMPIAR
        </button>
      </div>

      <div ref={memoryRef} className="term__memory">
        <span className="term__probe" aria-hidden="true">
          {PROBE_TEXT}
        </span>
        {[0, 1].map((column) => (
          <div key={column} className="term__column" data-column={column}>
            {game.lines
              .filter((line) => line.column === column)
              .map((line) => (
                <BoardLine
                  key={`${line.column}-${line.row}`}
                  line={line}
                  game={game}
                  onTryWord={handleTryWord}
                  onDud={handleDud}
                />
              ))}
          </div>
        ))}
      </div>

      <div className="term__foot">
        <div className="term__log" aria-live="polite">
          {game.log.map((line, i) => (
            <div key={i} className="term__log-line">
              {line}
            </div>
          ))}
        </div>
        <div className="term__hints">
          <span>CLIC PALABRA = PROBAR</span>
          <span>CLIC ( ) = DESBLOQUEO</span>
          <span>BACKSPACE LIMPIA</span>
          <span>N NUEVO</span>
        </div>
      </div>

      {game.phase === 'success' && (
        <div className="term__overlay">
          <div className="term__payload">
            {VAULT_PAYLOAD.map((line, i) => (
              <p key={i} className="term__payload-line">
                {line || '\u00a0'}
              </p>
            ))}
          </div>
          <button type="button" className="pip-btn pip-btn--primary" onClick={restart}>
            OTRA CONTRASEÑA
          </button>
        </div>
      )}

      {game.phase === 'locked' && (
        <div className="term__overlay">
          <p className="term__overlay-line">&gt;INTENTOS RESTANTES: 0</p>
          <p className="term__overlay-line">&gt;TERMINAL BLOQUEADO</p>
          <p className="term__countdown">{lockout}</p>
          <p className="term__overlay-line">
            REINICIO AUTOMATICO · CONTRASENA CAMBIADA
          </p>
          <button type="button" className="pip-btn" onClick={restart}>
            SALTAR ESPERA
          </button>
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   A single memory line

   Drawn group by group, and each group is ONE button. That is the whole
   interaction change: a candidate word and a bracket pair are single units
   that light up whole under the pointer, the way a bracket pair already did,
   and one click on a word is one complete guess.

   The noise is not a button at all. There are around two thousand characters
   on a board and only up to fifteen words in them, so making every character
   focusable and clickable bought nothing and cost a thousand tab stops.

   Every character on the board is still the SAME colour, because that is what
   makes the words a search instead of a multiple-choice question.
   ========================================================================== */

interface BoardLineProps {
  line: Line
  game: Game
  onTryWord: (wordIndex: number) => void
  onDud: (dudId: string) => void
}

function BoardLine({ line, game, onTryWord, onDud }: BoardLineProps) {
  return (
    <div className="term__line">
      <span className="term__addr">{line.address}</span>
      <span className="term__content">
        {line.groups.map((group: Group) => {
          if (group.kind === 'noise') {
            return (
              <span key={group.key} className="term__noise">
                {group.cells.map((cell) => (
                  <span key={cell.id} className="term__char">
                    {cell.char}
                  </span>
                ))}
              </span>
            )
          }

          if (group.kind === 'dud') {
            const used = game.usedDuds.has(group.dudId)
            return (
              <button
                key={group.key}
                type="button"
                className="term__cell term__dud"
                data-used={used || undefined}
                disabled={game.phase !== 'playing' || used}
                onClick={() => onDud(group.dudId)}
                aria-label="Desbloqueo"
              >
                {group.cells.map((cell) => cell.char)}
              </button>
            )
          }

          /* The word on trial keeps its per-position marks, so the board
             shows the same green and red the strip does. */
          const onTrial = game.trialWord === group.wordIndex
          const spent = game.tried.has(group.wordIndex)

          return (
            <button
              key={group.key}
              type="button"
              className="term__cell term__word"
              data-tried={spent || undefined}
              disabled={game.phase !== 'playing' || spent}
              onClick={() => onTryWord(group.wordIndex)}
              aria-label={`Palabra ${group.cells.map((c) => c.char).join('')}`}
            >
              {group.cells.map((cell, i) => (
                <span
                  key={cell.id}
                  className="term__char"
                  data-locked={onTrial && game.locked.has(i) ? true : undefined}
                  data-rejected={onTrial && game.rejected.has(i) ? true : undefined}
                >
                  {cell.char}
                </span>
              ))}
            </button>
          )
        })}
      </span>
    </div>
  )
}
