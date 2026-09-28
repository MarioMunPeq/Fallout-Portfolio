import type { Difficulty, DifficultyId } from './hackTypes'
import type { WordBuckets } from './words'

/**
 * How long the terminal stays locked after you run out of guesses. The attempt
 * limit is not a number any more — see `guessesAllowed`.
 */
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
const HEX = '0123456789ABCDEF'

/**
 * The five difficulties. Word length grows and, more importantly, the number
 * of candidate words on the board grows — more decoys is the real lever,
 * because every one of them is a plausible answer you can be wrong about.
 *
 * There is no letter-mix knob on purpose. The dump is symbols only, so the
 * candidate words are the only letters anywhere on the screen. That is the
 * search: you scan a wall of punctuation for a run of capitals. An earlier
 * version sprinkled random letters through the noise and it buried the very
 * thing the player was looking for.
 */
export const DIFFICULTIES: readonly Difficulty[] = [
  { id: 'novato', label: 'NOVATO', minLen: 4, maxLen: 4, symbols: NOISE_EXTRA.novato, candidates: 5 },
  { id: 'facil', label: 'FÁCIL', minLen: 5, maxLen: 5, symbols: NOISE_EXTRA.facil, candidates: 8 },
  { id: 'media', label: 'MEDIA', minLen: 6, maxLen: 7, symbols: NOISE_EXTRA.media, candidates: 10 },
  { id: 'dificil', label: 'DIFÍCIL', minLen: 8, maxLen: 9, symbols: NOISE_EXTRA.dificil, candidates: 12 },
  { id: 'muy-dificil', label: 'MUY DIFÍCIL', minLen: 10, maxLen: 11, symbols: NOISE_EXTRA['muy-dificil'], candidates: 15 },
]

/* ==========================================================================
   BOARD MODEL

   The board is a memory dump: a wall of garbage in which the candidate words
   are hidden. The words are NOT styled differently — they are the same
   colour as every other character on the screen, which is the entire point:
   you find them by reading the dump, not by spotting a highlight. Hovering
   one lights it white so you can aim at it.

   Two previous attempts got this wrong in opposite directions. The first
   painted whole words in hot phosphor over inert noise, which handed the
   player the answer set. The second removed the words altogether and left a
   pure character grid, which removed the only thing that made it playable.
   ========================================================================== */

export interface Cell {
  /** Stable board address; used as the React key. */
  id: string
  char: string
  /** Candidate word this character belongs to, or null for noise. */
  wordIndex: number | null
  /** Horizontal column. */
  slot: number
}

/** A run of adjacent cells that behave as one unit. */
export type Group =
  | { kind: 'noise'; key: string; cells: Cell[] }
  | { kind: 'word'; key: string; wordIndex: number; cells: Cell[] }
  | { kind: 'dud'; key: string; dudId: string; cells: Cell[] }

export interface Line {
  row: number
  /** 0 = left column, 1 = right column. */
  column: 0 | 1
  address: string
  cells: Cell[]
  groups: Group[]
}

export type Phase = 'playing' | 'accessing' | 'success' | 'locked'

export interface Game {
  difficulty: Difficulty
  wordLen: number
  candidates: readonly string[]
  /** Index of the password in `candidates`. */
  targetIndex: number
  lines: readonly Line[]

  /**
   * The word currently on trial, one cell per position. It is displayed in the
   * strip above the board and is never assembled by hand any more: clicking a
   * candidate puts the whole word here and scores it in the same gesture.
   *
   * It holds the Cell and not just its character on purpose. Two candidates
   * can share a letter, and character comparison would light up cells the
   * player never touched. Identity is the only comparison that behaves.
   */
  trial: readonly (Cell | null)[]
  /** Which candidate the trial belongs to; null before the first guess. */
  trialWord: number | null
  /** Positions of the password confirmed by any guess so far. They stay. */
  locked: ReadonlySet<number>
  /**
   * Positions the last guess got wrong. Kept in state rather than on a timer so
   * the red marks stay up exactly as long as the player is looking at them.
   */
  rejected: ReadonlySet<number>
  /** Candidates already spent. A spent word is a dead end: the same letters
      in the same places will always score the same, so it cannot be retried. */
  tried: ReadonlySet<number>
  usedDuds: ReadonlySet<string>
  attemptsUsed: number
  log: readonly string[]
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

/** The dump is symbols only. The candidate words supply every letter. */
function randomNoiseChar(difficulty: Difficulty): string {
  const symbols = NOISE_BASE + difficulty.symbols
  return symbols[randInt(0, symbols.length - 1)]
}

function makeAddress(): string {
  let hex = ''
  for (let i = 0; i < 6; i++) hex += HEX[randInt(0, HEX.length - 1)]
  return `0x${hex} `
}

/** Characters of text per column line, addresses and gap excluded. */
export function contentWidthFor(cols: number): number {
  return Math.max(12, Math.floor((cols - 2 * ADDRESS_WIDTH - COLUMN_GAP) / 2))
}

/** Longest candidate on the board, which is the guess length. */
function chooseWordLength(
  difficulty: Difficulty,
  buckets: WordBuckets,
  contentWidth: number,
): number {
  const ceiling = Math.max(4, Math.min(contentWidth - 2, difficulty.maxLen))
  const want = difficulty.candidates

  for (let len = ceiling; len >= difficulty.minLen; len--) {
    if ((buckets.get(len)?.length ?? 0) >= want) return len
  }
  return Math.max(4, Math.min(difficulty.minLen, ceiling))
}

function buildCandidates(
  difficulty: Difficulty,
  buckets: WordBuckets,
  contentWidth: number,
): { candidates: string[]; wordLen: number } {
  const wordLen = chooseWordLength(difficulty, buckets, contentWidth)
  const want = difficulty.candidates

  let pool = [...(buckets.get(wordLen) ?? [])]

  if (pool.length < want) {
    const extras = (FALLBACK_BY_LENGTH[wordLen] ?? []).filter(
      (w) => !pool.includes(w),
    )
    pool = [...pool, ...extras]
  }

  if (pool.length === 0) {
    return { candidates: ['VAULT'], wordLen }
  }

  const candidates = shuffle(pool).slice(
    0,
    Math.max(1, Math.min(want, pool.length)),
  )
  return { candidates, wordLen }
}

/**
 * Lay the dump out: noise everywhere, with each candidate word dropped in as
 * a contiguous run at a random line and column, and the bracket pairs
 * sprinkled between them. Nothing overlaps.
 */
function buildBoard(
  difficulty: Difficulty,
  candidates: readonly string[],
  contentWidth: number,
  totalRows: number,
): Line[] {
  const totalLines = totalRows * 2

  const grid: (Cell | null)[][] = Array.from({ length: totalLines }, () =>
    Array.from({ length: contentWidth }, () => null),
  )

  // A run of `width` cells starting at `start`; null if it would not fit.
  const place = (
    width: number,
    make: (slot: number, offset: number) => Cell | null,
  ): boolean => {
    for (let attempt = 0; attempt < 40; attempt++) {
      const lineIndex = randInt(0, totalLines - 1)
      const start = randInt(0, contentWidth - width)
      let free = true
      for (let i = 0; i < width; i++) {
        if (grid[lineIndex][start + i] !== null) free = false
      }
      if (!free) continue

      for (let i = 0; i < width; i++) {
        grid[lineIndex][start + i] = make(start + i, i)
      }
      return true
    }
    return false
  }

  candidates.forEach((word, wordIndex) => {
    place(word.length, (slot, offset) => ({
      id: `w${wordIndex}:${slot}`,
      char: word[offset],
      wordIndex,
      slot,
    }))
  })

  for (let i = 0; i < DUD_COUNT; i++) {
    const brackets = pick(DUD_TYPES)
    // The pair is placed as noise; the dudId rides on the group, not the cell.
    place(2, (slot, offset) => ({
      id: `d${i}:${slot}`,
      char: brackets[offset],
      wordIndex: null,
      slot,
    }))
  }

  // Fill the holes, then derive the groups the renderer walks.
  const dudIdsByCell = new Map<string, string>()
  for (let d = 0; d < DUD_COUNT; d++) {
    for (const line of grid) {
      for (const cell of line) {
        if (cell && cell.id.startsWith(`d${d}:`)) {
          dudIdsByCell.set(cell.id, `d${d}`)
        }
      }
    }
  }

  const lines: Line[] = grid.map((row, lineIndex) => {
    const cells: Cell[] = row.map((cell, slot) => {
      if (cell) return cell
      return {
        id: `n${lineIndex}:${slot}`,
        char: randomNoiseChar(difficulty),
        wordIndex: null,
        slot,
      }
    })

    return {
      row: lineIndex % totalRows,
      column: (lineIndex < totalRows ? 0 : 1) as 0 | 1,
      address: makeAddress(),
      cells,
      groups: buildGroups(cells, dudIdsByCell),
    }
  })

  return lines
}

/** Collapse adjacent cells into the runs the renderer draws. */
function buildGroups(cells: readonly Cell[], dudIds: ReadonlyMap<string, string>): Group[] {
  const groups: Group[] = []
  let run: Cell[] = []
  let kind: 'noise' | 'word' | 'dud' = 'noise'
  let key = ''

  const flush = () => {
    if (run.length === 0) return
    if (kind === 'word') {
      groups.push({
        kind: 'word',
        key,
        wordIndex: run[0].wordIndex as number,
        cells: run,
      })
    } else if (kind === 'dud') {
      groups.push({ kind: 'dud', key, dudId: key, cells: run })
    } else {
      groups.push({ kind: 'noise', key, cells: run })
    }
    run = []
  }

  for (const cell of cells) {
    const dudId = dudIds.get(cell.id) ?? null
    const nextKind: 'noise' | 'word' | 'dud' = dudId
      ? 'dud'
      : cell.wordIndex !== null
        ? 'word'
        : 'noise'
    const nextKey =
      nextKind === 'word'
        ? `w${cell.wordIndex}`
        : nextKind === 'dud'
          ? (dudId as string)
          : 'n'

    if (nextKind !== kind || nextKey !== key) {
      flush()
      kind = nextKind
      key = nextKey
    }
    run.push(cell)
  }
  flush()
  return groups
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
    targetIndex: randInt(0, candidates.length - 1),
    lines: buildBoard(difficulty, candidates, contentWidth, rows),
    trial: Array.from({ length: wordLen }, () => null),
    trialWord: null,
    locked: new Set(),
    rejected: new Set(),
    tried: new Set(),
    usedDuds: new Set(),
    attemptsUsed: 0,
    log: [
      '>CONECTANDO CON EL NODO…',
      '>LOCALIZA LAS PALABRAS EN EL VOLCADO',
      '>CLIC EN UNA PALABRA PARA PROBARLA',
    ],
    lockedAt: null,
    phase: 'playing',
  }
}

function pushLog(game: Game, ...lines: string[]): string[] {
  return [...game.log, ...lines].slice(-9)
}

/** Positions of the password confirmed so far. */
export function confirmedSlots(game: Game): number {
  return game.locked.size
}

/**
 * Guesses available on this board.
 *
 * There is no fixed attempt count any more, and that is the direct consequence
 * of guessing whole words instead of assembling them letter by letter. The
 * candidates are the only words on the board, so every word that is not the
 * password can be ruled out by trying it — which makes the limit exactly the
 * number of decoys. With a flat "four attempts" the game was unwinnable past
 * NOVATO: ten candidates, four tries, and a dud cost you a letter. So there is
 * no lockout left either; running out of guesses is not a state you can reach.
 * What still costs you is time, and the risk on the bracket pairs.
 */
export function guessesAllowed(difficulty: Difficulty): number {
  return Math.max(1, difficulty.candidates - 1)
}

/** The board cells of a candidate, in password order. */
export function cellsForWord(game: Game, wordIndex: number): readonly Cell[] {
  for (const line of game.lines) {
    for (const group of line.groups) {
      if (group.kind === 'word' && group.wordIndex === wordIndex) {
        return group.cells
      }
    }
  }
  return []
}

export type TryOutcome =
  | { kind: 'success' }
  | { kind: 'partial'; correct: number; total: number; wrong: number[] }
  | null

/**
 * Try a whole candidate word. This is the only way into the guess strip: there
 * is no assembling characters one at a time and no separate DESCIFRAR step, so
 * aiming at a word and pressing it is a single gesture.
 *
 * Scoring is FNV, unchanged: characters in the right position lock in and stay,
 * the rest are flagged and shown in red while still occupying their slot so the
 * player can see which ones failed. A confirmed letter is never cleared, so
 * the known positions accumulate across guesses.
 */
export function tryWord(
  game: Game,
  wordIndex: number,
): { game: Game; outcome: TryOutcome } {
  if (game.phase !== 'playing') return { game, outcome: null }
  // A spent word always scores the same. Replaying it would cost a guess and
  // teach nothing.
  if (game.tried.has(wordIndex)) return { game, outcome: null }

  const word = game.candidates[wordIndex] ?? ''
  const target = game.candidates[game.targetIndex] ?? ''
  const trial = [...cellsForWord(game, wordIndex)]

  const locked = new Set(game.locked)
  const wrong: number[] = []
  let correct = 0

  for (let slot = 0; slot < game.wordLen; slot++) {
    if (locked.has(slot)) continue
    if (word[slot] === target[slot]) {
      locked.add(slot)
      correct++
    } else {
      wrong.push(slot)
    }
  }

  const tried = new Set(game.tried).add(wordIndex)
  const attemptsUsed = game.attemptsUsed + 1

  if (locked.size === game.wordLen) {
    return {
      game: {
        ...game,
        trial,
        trialWord: wordIndex,
        locked,
        tried,
        attemptsUsed,
        rejected: new Set(),
        phase: 'accessing',
        log: pushLog(game, `>${word}`, '>COINCIDENCIA EXACTA', '>ACCEDIENDO AL SISTEMA…'),
      },
      outcome: { kind: 'success' },
    }
  }

  return {
    game: {
      ...game,
      trial,
      trialWord: wordIndex,
      locked,
      tried,
      attemptsUsed,
      rejected: new Set(wrong),
      log: pushLog(
        game,
        `>${word}`,
        '>ACCESO DENEGADO',
        `>${correct} CORRECTAS · ${wrong.length} INCORRECTAS`,
      ),
    },
    outcome: { kind: 'partial', correct, total: game.wordLen, wrong },
  }
}

/**
 * Wipe the red marks without spending a guess. A bracket pair used to do this
 * as one of its two outcomes; with word guessing there is nothing to wipe mid-
 * assembly any more, so the pair's other half became the risk instead (see
 * triggerDud) and this is just the undo.
 */
export function clearMarks(game: Game): Game {
  if (game.phase !== 'playing') return game
  if (game.rejected.size === 0) return game
  return {
    ...game,
    rejected: new Set(),
    log: pushLog(game, '>MARCAS DE ERROR BORRADAS'),
  }
}

export type DudOutcome =
  /** A confirmed letter, handed over for free. */
  | { kind: 'revealed'; slot: number; char: string }
  /** A guess spent on a word you did not choose. An empty `word` means there
      was nothing left to spend and the pair was consumed for nothing. */
  | { kind: 'spent'; word: string }
  | null

/**
 * Bracket pair. FNV-accurate: it either hands you a confirmed letter or burns
 * one of your guesses on a word you did not choose. It never costs a guess by
 * itself, and each pair is consumed so it cannot be farmed — that trade-off
 * is the whole point of the mechanic.
 *
 * The second outcome used to be "your selection is wiped", which punished
 * clicking a pair mid-assembly. There is no assembly to interrupt now: a click
 * is a complete guess, so the risk became a guess you never made. Which word it
 * spends is chosen among the ones you have not tried yet, so it can never
 * waste a try on something already ruled out.
 */
export function triggerDud(
  game: Game,
  dudId: string,
): { game: Game; outcome: DudOutcome } {
  if (game.phase !== 'playing') return { game, outcome: null }
  if (game.usedDuds.has(dudId)) return { game, outcome: null }

  const usedDuds = new Set(game.usedDuds).add(dudId)
  const word = game.candidates[game.targetIndex] ?? ''

  const open: number[] = []
  for (let slot = 0; slot < game.wordLen; slot++) {
    if (!game.locked.has(slot)) open.push(slot)
  }

  const untried: number[] = []
  for (let i = 0; i < game.candidates.length; i++) {
    if (i !== game.targetIndex && !game.tried.has(i)) untried.push(i)
  }
  const canSpend =
    untried.length > 0 && game.attemptsUsed < guessesAllowed(game.difficulty)

  if (open.length > 0 && (!canSpend || Math.random() < 0.5)) {
    const slot = pick(open)

    // The revealed cell comes from the password, so it is shown in the strip
    // only. Lighting it on the board would mark a cell of one specific word as
    // correct and hand the player the answer.
    const cell: Cell | null = cellsForWord(game, game.targetIndex)[slot] ?? null

    const trial = [...game.trial]
    trial[slot] = cell

    return {
      game: {
        ...game,
        usedDuds,
        trial,
        locked: new Set(game.locked).add(slot),
        rejected: new Set(),
        log: pushLog(game, `>REVELACION: ${word[slot]} EN POSICION ${slot + 1}`),
      },
      outcome: { kind: 'revealed', slot, char: word[slot] },
    }
  }

  if (canSpend) {
    const victim = pick(untried)
    // The log line goes in first so the console reads as one story: the pair
    // spends a guess, and then the word it spent it on is scored.
    const { game: next } = tryWord(
      { ...game, usedDuds, log: pushLog(game, '>DESBLOQUEO: PRUEBA GASTADA') },
      victim,
    )

    return {
      game: next,
      outcome: { kind: 'spent', word: game.candidates[victim] ?? '' },
    }
  }

  // Every position is confirmed and every decoy is spent, which means the round
  // is already over — but the pair still has to be consumed, or it would sit
  // there clickable forever doing nothing.
  return {
    game: {
      ...game,
      usedDuds,
      log: pushLog(game, '>DESBLOQUEO: SIN EFECTO'),
    },
    outcome: { kind: 'spent', word: '' },
  }
}
