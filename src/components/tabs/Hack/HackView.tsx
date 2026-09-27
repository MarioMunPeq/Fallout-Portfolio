import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, MutableRefObject, RefObject } from 'react'
import { TabNav } from '../../TabNav/TabNav'
import submoduleChangeSfx from '../../../assets/sfx/submodule_change.ogg'
import clickSfx from '../../../assets/sfx/mechanical-click.wav'
import okSfx from '../../../assets/sfx/UI_Pipboy_OK.ogg'
import blockedSfx from '../../../assets/sfx/electric-hum.wav'
import dudSfx from '../../../assets/sfx/computer-beep.wav'
import restartSfx from '../../../assets/sfx/toggle-switch.mp3'
import { playSfx } from '../../../utils/sfx'
import {
  DEFAULT_COLS,
  DEFAULT_ROWS,
  DIFFICULTIES,
  LOCKOUT_SECONDS,
  MAX_ATTEMPTS,
  createGame,
  guess,
  guessableWords,
  isWordLocked,
  scrubDud,
  triggerDud,
} from './hackGame'
import type { Game, Line, Token } from './hackGame'
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
  '  DESARROLLADOR DE SOFTWARE @ DIPUTACIÓN',
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
  const [cursor, setCursor] = useState(0)
  /** Ticking clock, only used to derive the lockout countdown. */
  const [now, setNow] = useState(() => Date.now())
  const wordButtons = useRef<(HTMLButtonElement | null)[]>([])

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

  /* ---- Timed lockout ------------------------------------------------------
     The remaining seconds are derived from `lockedAt` and a ticking clock
     rather than stored, so nothing has to be synchronised in an effect body.
     When the clock runs out the terminal reopens with fresh attempts and the
     strikes cleared: keeping them would leave the player with full attempts
     but a board of words they can no longer click. */
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
              struck: new Set<number>(),
              lastLikeness: null,
              lockedAt: null,
              log: [
                '>DESBLOQUEO AUTOMATICO',
                '>CONTRASENA CAMBIADA',
                '>INTENTOS RESTAURADOS: 4',
              ],
            }
          : current,
      )
    }, 250)

    return () => window.clearInterval(id)
  }, [game.phase, game.lockedAt])

  /* ---- Derived ------------------------------------------------------------ */
  const guessable = useMemo(() => guessableWords(game), [game])
  const guessableIndexes = useMemo(
    () => new Set(guessable.map((g) => g.wordIndex)),
    [guessable],
  )
  const activeIndex = guessable.length
    ? Math.min(cursor, guessable.length - 1)
    : -1

  useEffect(() => {
    if (activeIndex >= 0) wordButtons.current[activeIndex]?.focus()
  }, [activeIndex])

  /* ---- Actions ------------------------------------------------------------ */
  const restart = useCallback(() => {
    playSfx(restartSfx)
    setGame(createGame(difficultyId, buckets, cols, rows))
    setCursor(0)
  }, [difficultyId, buckets, cols, rows])

  const handleGuess = useCallback((wordIndex: number) => {
    setGame((current) => {
      if (current.phase !== 'playing') return current
      if (isWordLocked(current, wordIndex)) return current
      const next = guess(current, wordIndex)
      if (next === current) return current

      if (next.phase === 'accessing') playSfx(okSfx)
      else if (next.phase === 'locked') playSfx(blockedSfx)
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
      if (outcome.kind === 'erased') {
        return { ...next, lines: scrubDud(next.lines, dudId, next.difficulty) }
      }
      return next
    })
  }, [])

  /* ---- Keyboard ------------------------------------------------------------
     The old view drew a blinking ">" prompt with no input handling at all and
     `user-select: none`, so the whole game was mouse-only. */
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (game.phase !== 'playing' || guessable.length === 0) return

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault()
        setCursor((c) => (c + 1) % guessable.length)
        playSfx(clickSfx)
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault()
        setCursor((c) => (c - 1 + guessable.length) % guessable.length)
        playSfx(clickSfx)
        break
      case 'Home':
        event.preventDefault()
        setCursor(0)
        break
      case 'End':
        event.preventDefault()
        setCursor(guessable.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (activeIndex >= 0) handleGuess(guessable[activeIndex].wordIndex)
        break
      case 'n':
      case 'N':
        event.preventDefault()
        restart()
        break
    }
  }

  const remaining = MAX_ATTEMPTS - game.attemptsUsed
  const feedback = game.lastLikeness

  return (
    <div className="term__inner" onKeyDown={handleKeyDown}>
      <div className="term__head">
        <span>ROBCO TERMLINK v2.7</span>
        <span>
          {game.difficulty.label} · {game.wordLen} CAR.
        </span>
      </div>

      <div className="term__bar">
        <span className="term__attempts">{'>'}INTENTOS: {remaining}</span>
        <span className="term__blocks" aria-hidden="true">
          {Array.from({ length: MAX_ATTEMPTS }, (_, i) => (
            <i key={i} data-on={i < remaining || undefined} />
          ))}
        </span>
        {feedback && (
          <span key={`${feedback.word}-${feedback.value}`} className="term__feedback">
            {feedback.value}/{feedback.length} CORRECTAS
          </span>
        )}
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
                  guessableIndexes={guessableIndexes}
                  wordOrder={guessable}
                  onGuess={handleGuess}
                  onDud={handleDud}
                  registerWord={wordButtons}
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
          <span>←→ SELECCIONAR</span>
          <span>ENTER DESCIFRAR</span>
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
   ========================================================================== */

interface BoardLineProps {
  line: Line
  game: Game
  guessableIndexes: Set<number>
  wordOrder: { wordIndex: number; token: Token }[]
  onGuess: (wordIndex: number) => void
  onDud: (dudId: string) => void
  registerWord: MutableRefObject<(HTMLButtonElement | null)[]>
}

function BoardLine({
  line,
  game,
  guessableIndexes,
  wordOrder,
  onGuess,
  onDud,
  registerWord,
}: BoardLineProps) {
  const parts: React.ReactNode[] = []
  let cursor = 0

  line.tokens.forEach((token, i) => {
    // Noise is plain text. It used to be one <span> per character with an
    // onClick that charged an attempt — which is why a stray click anywhere
    // on the board cost a quarter of your life.
    if (token.start > cursor) {
      parts.push(
        <span key={`n${i}`} className="term__noise">
          {line.content.slice(cursor, token.start)}
        </span>,
      )
    }

    if (token.kind === 'dud') {
      const used = game.usedDuds.has(token.id)
      parts.push(
        <button
          key={token.id}
          type="button"
          className="term__token term__token--dud"
          data-used={used || undefined}
          onClick={() => onDud(token.id)}
          disabled={used}
          aria-label={used ? 'Desbloqueo ya usado' : 'Desbloqueo'}
        >
          {token.text}
        </button>,
      )
    } else {
      const wordIndex = token.wordIndex as number
      const locked = isWordLocked(game, wordIndex)
      const playable = guessableIndexes.has(wordIndex)
      const order = wordOrder.findIndex((w) => w.wordIndex === wordIndex)

      parts.push(
        <button
          key={token.id}
          type="button"
          ref={
            playable && order >= 0
              ? (el) => {
                  registerWord.current[order] = el
                }
              : undefined
          }
          className="term__token term__token--word"
          data-locked={locked || undefined}
          onClick={() => onGuess(wordIndex)}
          disabled={locked}
          tabIndex={playable ? 0 : -1}
        >
          {locked ? '·'.repeat(token.text.length) : token.text}
        </button>,
      )
    }

    cursor = token.end
  })

  if (cursor < line.content.length) {
    parts.push(
      <span key="tail" className="term__noise">
        {line.content.slice(cursor)}
      </span>,
    )
  }

  return (
    <div className="term__line">
      <span className="term__addr">{line.address}</span>
      <span className="term__content">{parts}</span>
    </div>
  )
}
