import type { Difficulty, DifficultyId } from './hackTypes'
import type { WordBuckets } from './words'

export const MAX_ATTEMPTS = 4

/** How long the terminal stays locked after you burn all four attempts. */
export const LOCKOUT_SECONDS = 8

/** "0x" + 6 hex digits + 1 separating space. */
export const ADDRESS_WIDTH = 9
/** Separator (in characters) between the two memory columns. */
export const COLUMN_GAP = 2

/** Used before the terminal has been measured. */
export const DEFAULT_COLS = 76
export const DEFAULT_ROWS = 16

const DUD_TYPES = ['<>', '{}', '[]', '()'] as const
const DUD_COUNT = 3
/** A word may never fill more than this fraction of a line. */
const MAX_WORD_FILL = 0.5

/**
 * Fallback pool, grouped by length. The curated dictionary can come up short
 * at a given length; without this the board could generate with too few words
 * to be a fair game, or with none at all.
 */
const FALLBACK_BY_LENGTH: Record<number, readonly string[]> = {
  4: ['VAULT', 'DOOR', 'KEYS', 'CORE', 'DIAL', 'LOCK', 'GAME', 'BANG', 'HIDE', 'SAFE'],
  5: ['PIPBOY', 'BRAVO', 'ALPHA', 'DELTA', 'GAMMA', 'SIGMA', 'OMEGA', 'RADIO', 'STEEL', 'VAULT'],
  6: ['SHELTER', 'BOSCO', 'SECRET', 'ROBCO', 'CIPHER', 'MARKER', 'HOLLOW', 'CASTLE', 'DRIFTER'],
  7: ['TERMINAL', 'COBALT', 'DIAMOND', 'FALLOUT', 'HOLLOW', 'LANTERN', 'NEUTRON', 'SCRIBBLR'],
  8: ['SECURITY', 'ARMAMENT', 'DWELLER', 'FORTRESS', 'GUNMAN', 'INVENTOR', 'PLASMA'],
  9: ['SIGNATURE', 'MASTERKEY', 'PHOENIX', 'RAILGUN', 'STEALTH', 'SYNTHETIC'],
  10: ['MASTERWORK', 'NIGHTFALL', 'RADIATION', 'RECONNAIS', 'WASTELANDER'],
  11: ['GHOSTBUSTER', 'OVERSEER', 'PREDATOR', 'VANGUARD', 'WASTELANDER'],
  12: ['PARADISEFRONT', 'THEMETCOMBUST'],
}

const NOISE_BASE = ".,;:!?'`-"
const NOISE_EXTRA: Record<DifficultyId, string> = {
  novato: '()',
  facil: '()[]',
  media: '()[]{}/\\',
  dificil: '()[]{}/\\=+-*#%',
  'muy-dificil': '()[]{}/\\=+-*#%@&_|"$^~',
}
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const HEX = '0123456789ABCDEF'

/**
 * The five FNV difficulties. Word length grows and, more importantly, the
 * number of candidates grows — a bigger pool is a lower chance of guessing
 * blind, which is the real difficulty lever.
 */
export const DIFFICULTIES: readonly Difficulty[] = [
  { id: 'novato', label: 'NOVATO', minLen: 4, maxLen: 4, symbols: NOISE_EXTRA.novato, letterChance: 0.11, candidates: 5 },
  { id: 'facil', label: 'FÁCIL', minLen: 5, maxLen: 5, symbols: NOISE_EXTRA.facil, letterChance: 0.1, candidates: 8 },
  { id: 'media', label: 'MEDIA', minLen: 6, maxLen: 7, symbols: NOISE_EXTRA.media, letterChance: 0.09, candidates: 10 },
  { id: 'dificil', label: 'DIFÍCIL', minLen: 8, maxLen: 9, symbols: NOISE_EXTRA.dificil, letterChance: 0.08, candidates: 12 },
  { id: 'muy-dificil', label: 'MUY DIFÍCIL', minLen: 10, maxLen: 11, symbols: NOISE_EXTRA['muy-dificil'], letterChance: 0.07, candidates: 15 },
]

/* ==========================================================================
   BOARD MODEL
   Tokens are resolved once at build time instead of re-parsed on every
   render, and noise is plain text with no per-character spans — which is
   only possible because clicking noise no longer costs an attempt.
   ========================================================================== */

export interface Token {
  /** Unique within the game. */
  id: string
  /** Character offset in the line's content. */
  start: number
  /** Exclusive end offset. */
  end: number
  text: string
  kind: 'word' | 'dud'
  /** Index into Game.candidates, for word tokens. */
  wordIndex?: number
}

export interface Line {
  row: number
  /** 0 = left column, 1 = right column. */
  column: 0 | 1
  address: string
  content: string
  /** Sorted by start. */
  tokens: readonly Token[]
}

export type Phase = 'playing' | 'accessing' | 'success' | 'locked'

export interface Likeness {
  word: string
  value: number
  length: number
}

export interface Game {
  difficulty: Difficulty
  wordLen: number
  candidates: readonly string[]
  correctIndex: number
  lines: readonly Line[]
  attemptsUsed: number
  /** Guessed and known wrong: rendered as dots, not clickable. */
  struck: ReadonlySet<number>
  /** Wiped from the board by a dud: not clickable. */
  erased: ReadonlySet<number>
  usedDuds: ReadonlySet<string>
  log: readonly string[]
  /** Most recent guess feedback, for the big readout. */
  lastLikeness: Likeness | null
  /** When the lockout started; null while the terminal is open. */
  lockedAt: number | null
  phase: Phase
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

function shuffle<T>(list: readonly T[]): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(0, i)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function makeNoise(length: number, difficulty: Difficulty): string {
  const symbols = NOISE_BASE + difficulty.symbols
  let out = ''
  for (let i = 0; i < length; i++) {
    out +=
      Math.random() < difficulty.letterChance
        ? LETTERS[randInt(0, LETTERS.length - 1)]
        : symbols[randInt(0, symbols.length - 1)]
  }
  return out
}

function makeAddress(): string {
  let hex = ''
  for (let i = 0; i < 6; i++) hex += HEX[randInt(0, HEX.length - 1)]
  return `0x${hex} `
}

/** How many character positions match exactly — the game's core hint. */
export function likeness(guess: string, correct: string): number {
  let count = 0
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === correct[i]) count++
  }
  return count
}

/** Characters of text per column line, addresses and gap excluded. */
export function contentWidthFor(cols: number): number {
  return Math.max(
    12,
    Math.floor((cols - 2 * ADDRESS_WIDTH - COLUMN_GAP) / 2),
  )
}

/**
 * Picks a word length that both fits the difficulty band AND leaves room for
 * noise in the line. The old code clamped the *board* to a minimum width
 * instead, which let a 12-letter word land in a 14-character line and made
 * the whole board trivially readable.
 */
function chooseWordLength(difficulty: Difficulty, buckets: WordBuckets, contentWidth: number): number {
  const ceiling = Math.max(4, Math.floor(contentWidth * MAX_WORD_FILL))
  const want = difficulty.candidates

  // Prefer a length that can supply the full candidate list.
  for (let len = Math.min(difficulty.maxLen, ceiling); len >= difficulty.minLen; len--) {
    if ((buckets.get(len)?.length ?? 0) >= want) return len
  }
  // Otherwise take the length with the biggest pool in range.
  let best = Math.max(4, Math.min(difficulty.minLen, ceiling))
  let bestCount = -1
  for (let len = Math.max(4, Math.min(difficulty.minLen, ceiling)); len <= Math.min(difficulty.maxLen, ceiling); len++) {
    const count = buckets.get(len)?.length ?? 0
    if (count > bestCount) {
      bestCount = count
      best = len
    }
  }
  return best
}

function buildCandidates(
  difficulty: Difficulty,
  buckets: WordBuckets,
  contentWidth: number,
): { candidates: string[]; wordLen: number } {
  const wordLen = chooseWordLength(difficulty, buckets, contentWidth)
  const want = difficulty.candidates

  let pool = [...(buckets.get(wordLen) ?? [])]

  // Top up from the bundled fallbacks so the pool always reaches `want`.
  if (pool.length < want) {
    const extras = (FALLBACK_BY_LENGTH[wordLen] ?? []).filter(
      (w) => !pool.includes(w),
    )
    pool = [...pool, ...extras]
  }

  if (pool.length === 0) {
    return { candidates: ['VAULT'], wordLen }
  }

  // If we still can't reach the target, the pool is what it is; play on.
  const candidates = shuffle(pool).slice(0, Math.max(1, Math.min(want, pool.length)))
  return { candidates, wordLen }
}

interface Planned {
  lineIndex: number
  col: number
  text: string
  kind: 'word' | 'dud'
  wordIndex?: number
  slotId: string
}

function buildBoard(
  difficulty: Difficulty,
  candidates: readonly string[],
  contentWidth: number,
  totalRows: number,
): Line[] {
  const totalLines = totalRows * 2

  const planned: Planned[] = candidates.map((text, wordIndex) => ({
    lineIndex: -1,
    col: 0,
    text,
    kind: 'word',
    wordIndex,
    slotId: `w${wordIndex}`,
  }))

  for (let i = 0; i < DUD_COUNT; i++) {
    const brackets = pick(DUD_TYPES)
    const filler = makeNoise(randInt(1, 3), { ...difficulty, letterChance: 0 })
    planned.push({
      lineIndex: -1,
      col: 0,
      text: `${brackets[0]}${filler}${brackets[1]}`,
      kind: 'dud',
      // Ids are minted here and reused verbatim by the renderer, so there is
      // exactly one id scheme. The old code minted `d<lineIndex>` at build
      // time and `d<col>-<row>:<start>:<end>` at parse time, and the
      // used-dud lookup could therefore never match.
      slotId: `d${i}`,
    })
  }

  // One token per line. If the board is shorter than the token count, extra
  // tokens are dropped rather than stacked.
  const linePool = shuffle(
    Array.from({ length: totalLines }, (_, i) => i),
  ).slice(0, planned.length)

  planned.forEach((token, index) => {
    token.lineIndex = linePool[index]
    const slack = contentWidth - token.text.length
    token.col = slack > 0 ? randInt(0, slack) : 0
  })

  const byLine = new Map<number, Planned>()
  for (const token of planned) {
    if (token.lineIndex >= 0) byLine.set(token.lineIndex, token)
  }

  const lines: Line[] = []
  for (let lineIndex = 0; lineIndex < totalLines; lineIndex++) {
    const column: 0 | 1 = lineIndex < totalRows ? 0 : 1
    const row = lineIndex % totalRows
    const content = makeNoise(contentWidth, difficulty)

    const token = byLine.get(lineIndex)
    let tokens: Token[] = []

    if (token) {
      const placed =
        content.slice(0, token.col) +
        token.text +
        content.slice(token.col + token.text.length)
      tokens = [
        {
          id: token.slotId,
          start: token.col,
          end: token.col + token.text.length,
          text: token.text,
          kind: token.kind,
          wordIndex: token.wordIndex,
        },
      ]
      lines.push({
        row,
        column,
        address: makeAddress(),
        content: placed,
        tokens,
      })
    } else {
      lines.push({ row, column, address: makeAddress(), content, tokens })
    }
  }

  return lines
}

export function createGame(
  difficultyId: DifficultyId,
  buckets: WordBuckets,
  cols = DEFAULT_COLS,
  rows = DEFAULT_ROWS,
): Game {
  const difficulty =
    DIFFICULTIES.find((d) => d.id === difficultyId) ?? DIFFICULTIES[0]

  const contentWidth = contentWidthFor(cols)
  const { candidates, wordLen } = buildCandidates(difficulty, buckets, contentWidth)

  return {
    difficulty,
    wordLen,
    candidates,
    correctIndex: randInt(0, candidates.length - 1),
    lines: buildBoard(difficulty, candidates, contentWidth, rows),
    attemptsUsed: 0,
    struck: new Set(),
    erased: new Set(),
    usedDuds: new Set(),
    log: ['>CONECTANDO CON EL NODO…', '>ESCRIBE UNA CONTRASEÑA'],
    lastLikeness: null,
    lockedAt: null,
    phase: 'playing',
  }
}

function pushLog(game: Game, ...lines: string[]): string[] {
  // Keep the console to a readable length.
  return [...game.log, ...lines].slice(-9)
}

/** Words that are known-wrong or erased can never be guessed again. */
export function isWordLocked(game: Game, wordIndex: number): boolean {
  return game.struck.has(wordIndex) || game.erased.has(wordIndex)
}

/**
 * Guess a candidate word.
 *
 * Wrong guesses cost an attempt and report positional matches, exactly like
 * FO3/NV. Guessing a word you already know is wrong is a no-op that returns
 * the same object, so a stray re-click can never burn a second attempt.
 */
export function guess(game: Game, wordIndex: number): Game {
  if (game.phase !== 'playing') return game
  if (isWordLocked(game, wordIndex)) return game

  const word = game.candidates[wordIndex]
  if (!word) return game

  if (wordIndex === game.correctIndex) {
    return {
      ...game,
      phase: 'accessing',
      log: pushLog(game, `>${word}`, '>COINCIDENCIA EXACTA', '>ACCEDIENDO AL SISTEMA…'),
    }
  }

  const correct = game.candidates[game.correctIndex]
  const value = likeness(word, correct)
  const attemptsUsed = game.attemptsUsed + 1
  const locked = attemptsUsed >= MAX_ATTEMPTS

  const log = pushLog(game, `>${word}`, '>ACCESO DENEGADO', `>${value}/${word.length} CORRECTAS`)
  if (locked) {
    log.push('>INTENTOS RESTANTES: 0', `>TERMINAL BLOQUEADO ${LOCKOUT_SECONDS}s`)
  }

  return {
    ...game,
    attemptsUsed,
    struck: new Set(game.struck).add(wordIndex),
    lastLikeness: { word, value, length: word.length },
    // Locked, not permanently dead: the countdown reopens the terminal.
    phase: locked ? 'locked' : 'playing',
    lockedAt: locked ? Date.now() : game.lockedAt,
    log,
  }
}

export type DudOutcome =
  | { kind: 'erased'; word: string }
  | { kind: 'attempts'; count: number }
  | null

/**
 * Trigger a dud pair. FNV-accurate: it either wipes one still-unknown wrong
 * word off the board, or restores every attempt you have spent. It never
 * costs an attempt, and the pair is consumed so it can't be farmed.
 *
 * The previous version did this silently, so players never learned which of
 * the two outcomes they'd triggered. It now returns a description.
 */
export function triggerDud(
  game: Game,
  dudId: string,
): { game: Game; outcome: DudOutcome } {
  if (game.phase !== 'playing') return { game, outcome: null }
  if (game.usedDuds.has(dudId)) return { game, outcome: null }

  const usedDuds = new Set(game.usedDuds).add(dudId)

  // Prefer erasing a word you haven't already guessed — a struck word is
  // known-bad information, so wiping it wastes the dud.
  const erasable = game.candidates
    .map((word, index) => ({ word, index }))
    .filter(
      ({ index }) =>
        index !== game.correctIndex && !isWordLocked(game, index),
    )

  const wantsErase = Math.random() < 0.5

  if (wantsErase && erasable.length > 0) {
    const victim = pick(erasable)
    return {
      game: {
        ...game,
        usedDuds,
        erased: new Set(game.erased).add(victim.index),
        log: pushLog(game, `>DESBLOQUEO: ${victim.word} BORRADO DE MEMORIA`),
      },
      outcome: { kind: 'erased', word: victim.word },
    }
  }

  const restored = MAX_ATTEMPTS - game.attemptsUsed
  return {
    game: {
      ...game,
      usedDuds,
      attemptsUsed: 0,
      // A full reset must also lift the strikes, or the player is left with
      // fresh attempts and a board of words they can no longer click.
      struck: new Set<number>(),
      log: pushLog(game, `>DESBLOQUEO: ${restored} INTENTOS RESTAURADOS`),
    },
    outcome: { kind: 'attempts', count: restored },
  }
}

/** Wipe a dud pair's characters back into noise. */
export function scrubDud(lines: readonly Line[], dudId: string, difficulty: Difficulty): Line[] {
  return lines.map((line) => {
    const token = line.tokens.find((t) => t.id === dudId)
    if (!token || token.kind !== 'dud') return line

    const replacement = makeNoise(token.text.length, difficulty)
    const content =
      line.content.slice(0, token.start) +
      replacement +
      line.content.slice(token.end)

    return {
      ...line,
      content,
      tokens: line.tokens.filter((t) => t.id !== dudId),
    }
  })
}

/** Every guessable word still on the board, in reading order. */
export function guessableWords(game: Game): { wordIndex: number; token: Token }[] {
  const out: { wordIndex: number; token: Token }[] = []
  for (const line of game.lines) {
    for (const token of line.tokens) {
      if (token.kind === 'word' && token.wordIndex !== undefined) {
        out.push({ wordIndex: token.wordIndex, token })
      }
    }
  }
  return out.sort((a, b) => {
    if (a.token.start !== b.token.start) return a.token.start - b.token.start
    return (a.wordIndex ?? 0) - (b.wordIndex ?? 0)
  })
}
