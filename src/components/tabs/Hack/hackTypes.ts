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
  /**
   * How many candidate words sit on the board. This is the real difficulty
   * lever: a bigger pool means more plausible answers to be wrong about.
   */
  candidates: number
}
