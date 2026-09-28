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
  correctIndex: number
  lines: readonly Line[]
  /**
   * The cell currently filling each guess slot, or null.
   *
   * It holds the Cell and not just its character on purpose. Two candidates
   * can share a letter, and character comparison would light up cells the
   * player never touched. Identity is the only comparison that behaves.
   */
  selection: readonly (Cell | null)[]
  /** Slots confirmed correct by a previous attempt. They stay locked in. */
  locked: ReadonlySet<number>
  /**
   * Slots that were just wrong. Kept in state rather than on a timer so the
   * red marks stay up exactly as long as the player is looking at them, and
   * are cleared by the next click.
   */
  rejected: ReadonlySet<number>
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
    correctIndex: randInt(0, candidates.length - 1),
    lines: buildBoard(difficulty, candidates, contentWidth, rows),
    selection: Array.from({ length: wordLen }, () => null),
    locked: new Set(),
    rejected: new Set(),
    usedDuds: new Set(),
    attemptsUsed: 0,
    log: [
      '>CONECTANDO CON EL NODO…',
      '>LOCALIZA LA CONTRASEÑA EN EL VOLCADO',
    ],
    lockedAt: null,
    phase: 'playing',
  }
}

function pushLog(game: Game, ...lines: string[]): string[] {
  return [...game.log, ...lines].slice(-9)
}

/** How many guess slots are still open. */
export function openSlots(game: Game): number {
  let count = 0
  for (let i = 0; i < game.wordLen; i++) {
    if (!game.locked.has(i)) count++
  }
  return count
}

/**
 * Every slot filled by a fresh pick or a confirmed letter, and nothing still
 * flagged wrong. The rejected check matters: right after a failed attempt the
 * wrong characters stay in their slots so they can be shown in red, and until
 * the player has replaced them the guess is not really a new guess.
 */
export function isComplete(game: Game): boolean {
  if (game.rejected.size > 0) return false
  return game.selection.every((cell, i) => cell !== null || game.locked.has(i))
}

/**
 * Click a character. It lands in the first guess slot that still needs one, in
 * click order — the FNV rule. A slot still flagged wrong from the last attempt
 * is repaired first, so each new pick clears one red mark. Clicking a cell
 * that is already in the guess removes it again, so a misclick is undoable.
 */
export function selectCell(game: Game, cell: Cell): Game {
  if (game.phase !== 'playing') return game

  const selection = [...game.selection]

  const existing = selection.indexOf(cell)
  if (existing >= 0) {
    selection[existing] = null
    const rejected = new Set(game.rejected)
    rejected.delete(existing)
    return { ...game, selection, rejected }
  }

  // A slot still marked wrong takes priority: that is the one the player is
  // looking at.
  let target = -1
  for (const slot of game.rejected) {
    if (slot >= 0 && slot < game.wordLen && !game.locked.has(slot)) {
      target = slot
      break
    }
  }

  if (target < 0) {
    for (let i = 0; i < game.wordLen; i++) {
      if (game.locked.has(i)) continue
      if (selection[i] !== null) continue
      target = i
      break
    }
  }

  if (target < 0) return game

  selection[target] = cell
  const rejected = new Set(game.rejected)
  rejected.delete(target)
  return { ...game, selection, rejected }
}

export type SubmitOutcome =
  | { kind: 'success' }
  | { kind: 'partial'; correct: number; total: number; wrong: number[] }
  | null

/**
 * Score the guess, FNV rules: characters in the right position lock in and
 * stay, the rest are flagged and shown in red while still occupying their slot
 * so the player can see which ones failed. A confirmed letter is never
 * cleared, so the known prefix accumulates across attempts.
 */
export function submit(game: Game): { game: Game; outcome: SubmitOutcome } {
  if (game.phase !== 'playing') return { game, outcome: null }
  if (!isComplete(game)) return { game, outcome: null }

  const word = game.candidates[game.correctIndex] ?? ''
  const next = [...game.selection]
  const locked = new Set(game.locked)
  const wrong: number[] = []
  let correct = 0

  for (let slot = 0; slot < game.wordLen; slot++) {
    if (locked.has(slot)) continue
    const chosen = next[slot]
    if (chosen === null) continue

    if (chosen.char === word[slot]) {
      locked.add(slot)
      correct++
    } else {
      // Left in place on purpose: it stays visible in red until the player
      // picks over it.
      wrong.push(slot)
    }
  }

  const attemptsUsed = game.attemptsUsed + 1

  if (locked.size === game.wordLen) {
    return {
      game: {
        ...game,
        selection: next,
        locked,
        attemptsUsed,
        rejected: new Set(),
        phase: 'accessing',
        log: pushLog(game, '>COINCIDENCIA EXACTA', '>ACCEDIENDO AL SISTEMA…'),
      },
      outcome: { kind: 'success' },
    }
  }

  const dead = attemptsUsed >= MAX_ATTEMPTS
  const log = pushLog(
    game,
    `>${next.map((cell) => cell?.char ?? '_').join('')}`,
    '>ACCESO DENEGADO',
    `>${correct} CORRECTAS · ${wrong.length} INCORRECTAS`,
  )
  if (dead) {
    log.push('>INTENTOS RESTANTES: 0', `>TERMINAL BLOQUEADO ${LOCKOUT_SECONDS}s`)
  }

  return {
    game: {
      ...game,
      selection: next,
      locked,
      attemptsUsed,
      rejected: new Set(wrong),
      phase: dead ? 'locked' : 'playing',
      lockedAt: dead ? Date.now() : game.lockedAt,
      log,
    },
    outcome: { kind: 'partial', correct, total: game.wordLen, wrong },
  }
}

export type DudOutcome =
  | { kind: 'revealed'; slot: number; char: string }
  | { kind: 'cleared' }
  | null

/**
 * Bracket pair. FNV-accurate: it either hands you a confirmed letter or wipes
 * your selection. It never costs an attempt, and each pair is consumed so it
 * cannot be farmed — that trade-off is the whole point of the mechanic.
 */
export function triggerDud(
  game: Game,
  dudId: string,
): { game: Game; outcome: DudOutcome } {
  if (game.phase !== 'playing') return { game, outcome: null }
  if (game.usedDuds.has(dudId)) return { game, outcome: null }

  const usedDuds = new Set(game.usedDuds).add(dudId)
  const word = game.candidates[game.correctIndex] ?? ''

  const open: number[] = []
  for (let slot = 0; slot < game.wordLen; slot++) {
    if (!game.locked.has(slot)) open.push(slot)
  }

  if (open.length > 0 && Math.random() < 0.5) {
    const slot = pick(open)

    // Reveal the real cell on the board, not a synthesised character, so the
    // player sees a letter light up in the dump as well as in the strip.
    let cell: Cell | null = null
    for (const line of game.lines) {
      for (const group of line.groups) {
        if (group.kind === 'word' && group.wordIndex === game.correctIndex) {
          cell = group.cells[slot] ?? null
        }
      }
    }

    const selection = [...game.selection]
    selection[slot] = cell

    return {
      game: {
        ...game,
        usedDuds,
        selection,
        locked: new Set(game.locked).add(slot),
        rejected: new Set(),
        log: pushLog(game, `>REVELACION: ${word[slot]} EN POSICION ${slot + 1}`),
      },
      outcome: { kind: 'revealed', slot, char: word[slot] },
    }
  }

  const cleared = game.selection.map((cell, i) =>
    game.locked.has(i) ? cell : null,
  )

  return {
    game: {
      ...game,
      usedDuds,
      selection: cleared,
      rejected: new Set(),
      log: pushLog(game, '>BORRADO DE MEMORIA: SELECCION REINICIADA'),
    },
    outcome: { kind: 'cleared' },
  }
}
