/* ==========================================================================
   OPERATOR PROFILE
   Single source of truth for the character sheet. The STATUS tab and the
   global status bar both read from here, so HP can never disagree with
   itself between tabs.
   ========================================================================== */

export type StatId = 'STR' | 'PER' | 'END' | 'CHR' | 'INT' | 'AGL' | 'LCK'

/** Fallout's SPECIAL, 1-10. */
export const SPECIAL_STATS: readonly {
  id: StatId
  /** What this stat does, shown in the readout. */
  detail: string
  value: number
}[] = [
  { id: 'STR', detail: 'CARGA', value: 7 },
  { id: 'PER', detail: 'PUNTERÍA', value: 6 },
  { id: 'END', detail: 'RESISTENCIA', value: 5 },
  { id: 'CHR', detail: 'CARISMA', value: 4 },
  { id: 'INT', detail: 'INTELIGENCIA', value: 8 },
  { id: 'AGL', detail: 'AGILIDAD', value: 6 },
  { id: 'LCK', detail: 'SUERTE', value: 5 },
]

export const OPERATOR = {
  name: 'Mario Muñoz Pequeño',
  handle: 'MarioMunPeq',
  role: 'Pega Developer',
  origin: 'Valladolid, España',
  employer: 'Cognizant',
  level: 24,
  /** XP earned / XP required for level 25. */
  xp: 18_420,
  xpForNext: 24_000,
  hp: 115,
  hpMax: 115,
  ap: 90,
  apMax: 90,
  /** Rads. Above 50 the readout switches to a warning state. */
  radiation: 25,
  carryLoad: 54,
  carryLoadMax: 100,
  ammo: 100,
  ammoPct: 100,
} as const

export type Condition = {
  id: 'ammo' | 'armor' | 'radiation' | 'helmet'
  label: string
  value: string
  /** Fill fraction for the little gauge under the icon. */
  pct: number
  /** Show a dash instead of a number (no helmet equipped). */
  empty?: boolean
}

export const CONDITIONS: readonly Condition[] = [
  { id: 'ammo', label: 'MUNICIÓN', value: `${OPERATOR.ammoPct}%`, pct: OPERATOR.ammoPct },
  {
    id: 'armor',
    label: 'ARMADURA',
    value: `${OPERATOR.carryLoad}/${OPERATOR.carryLoadMax}`,
    pct: (OPERATOR.carryLoad / OPERATOR.carryLoadMax) * 100,
  },
  { id: 'radiation', label: 'RADIACIÓN', value: String(OPERATOR.radiation), pct: OPERATOR.radiation },
  { id: 'helmet', label: 'CASCO', value: '—', pct: 0, empty: true },
]
