/**
 * Filter constants and helpers for game filtering.
 * 
 * Extracted from useWizardState to enable reuse across hooks and services.
 */
import type { WizardFilters } from '../../store/wizardTypes'

/**
 * Default filter configuration for new wizard sessions.
 */
export const DEFAULT_FILTERS: WizardFilters = {
  playerCount: 4,
  timeRange: { min: 0, max: 300 },
  mode: 'any',
  requireBestWithPlayerCount: false,
  excludeLowRatedThreshold: null,
  ageRange: { min: 0, max: 21 },
  complexityRange: { min: 0, max: 5 },
  ratingRange: { min: 0, max: 10 },
}

/**
 * BGG mechanics that indicate cooperative gameplay.
 * Used to filter games by coop/competitive mode.
 */
export const COOP_MECHANICS = [
  'Cooperative Game',
  'Solo / Solitaire Game',
  'Team-Based Game',
] as const

/**
 * Check if a game is cooperative based on its mechanics.
 */
export function isCoopGame(mechanics?: string[]): boolean {
  if (!mechanics) return false
  return mechanics.some((m) => COOP_MECHANICS.includes(m as typeof COOP_MECHANICS[number]))
}
