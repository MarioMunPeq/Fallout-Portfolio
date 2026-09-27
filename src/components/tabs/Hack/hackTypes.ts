export type DifficultyId =
  | 'novato'
  | 'facil'
  | 'media'
  | 'dificil'
  | 'muy-dificil'

export interface Difficulty {
  id: DifficultyId
  label: string
  /** Range of word lengths (in letters) for this level. */
  minLen: number
  maxLen: number
  /** Extra symbols added to the base noise set (. , ; : ! ? ' - `). */
  symbols: string
  /** Probability (0..1) that a noise cell is a random letter. */
  letterChance: number
  /**
   * How many candidate words sit on the board. This is the real difficulty
   * lever: a bigger pool means a lower chance of guessing blind.
   */
  candidates: number
}
