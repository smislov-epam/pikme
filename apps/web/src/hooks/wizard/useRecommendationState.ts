/**
 * Hook for managing recommendation state in the wizard.
 * 
 * Single responsibility: Compute recommendations, handle promoted alternatives.
 * 
 * ## Usage
 * 
 * ```ts
 * const { recommendation, promoteAlternativeToTopPick } = useRecommendationState({
 *   filteredGames,
 *   preferences,
 *   users,
 *   filters,
 * })
 * ```
 */
import { useMemo, useState, useCallback } from 'react'
import type { GameRecord, UserRecord, UserPreferenceRecord } from '../../db/types'
import type { WizardFilters } from '../../store/wizardTypes'
import type { RecommendationState, RecommendationActions, RecommendationResult } from './types'
import { computeRecommendation } from '../../services/recommendation/computeRecommendation'

export interface UseRecommendationStateOptions {
  /** Games that passed all filters */
  filteredGames: GameRecord[]
  /** User preferences by username */
  preferences: Record<string, UserPreferenceRecord[]>
  /** Current users in session */
  users: UserRecord[]
  /** Current filters */
  filters: WizardFilters
}

export interface UseRecommendationStateResult extends RecommendationState, RecommendationActions {
  /** Direct setter for promoted pick */
  setPromotedPickBggId: (bggId: number | null) => void
}

export function useRecommendationState(
  options: UseRecommendationStateOptions,
): UseRecommendationStateResult {
  const { filteredGames, preferences, users, filters } = options

  const [promotedPickBggId, setPromotedPickBggId] = useState<number | null>(null)

  // Compute recommendation using the pure function
  const recommendation = useMemo((): RecommendationResult => {
    return computeRecommendation({
      games: filteredGames,
      preferences,
      users,
      filters,
      promotedPickBggId,
    })
  }, [filteredGames, preferences, users, filters, promotedPickBggId])

  const promoteAlternativeToTopPick = useCallback((bggId: number) => {
    setPromotedPickBggId(bggId)
  }, [])

  // computeRecommendation is now reactive - this is a no-op for backward compat
  const computeRecommendationAction = useCallback(() => {
    // Recommendation is computed reactively via useMemo
  }, [])

  return {
    // State
    recommendation,
    promotedPickBggId,

    // Actions
    computeRecommendation: computeRecommendationAction,
    promoteAlternativeToTopPick,

    // Direct setter
    setPromotedPickBggId,
  }
}
