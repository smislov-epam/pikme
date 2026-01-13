export type GameMode = 'coop' | 'competitive' | 'any'

export interface WizardFilters {
  playerCount: number
  timeRange: { min: number; max: number }
  mode: GameMode

  /** Exclude games rated below this by any player (null = off) */
  excludeLowRatedThreshold: number | null

  /** Filter by the game “minimum age” field (years) */
  ageRange: { min: number; max: number }

  /** BGG weight/complexity (1–5) */
  complexityRange: { min: number; max: number }

  /** BGG average rating (0–10) */
  ratingRange: { min: number; max: number }
}
