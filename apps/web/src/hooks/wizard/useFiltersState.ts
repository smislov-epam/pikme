/**
 * Hook for managing filter state in the wizard.
 * 
 * Single responsibility: Filter configuration and derived filtered games.
 * 
 * ## Usage
 * 
 * ```ts
 * const { filters, filteredGames, setPlayerCount, ... } = useFiltersState({
 *   sessionGames,
 *   userRatings,
 *   initialFilters,
 * })
 * ```
 */
import { useState, useCallback, useMemo } from 'react'
import type { GameRecord } from '../../db/types'
import type { WizardFilters } from '../../store/wizardTypes'
import type { FiltersState, FiltersActions } from './types'
import { DEFAULT_FILTERS } from '../../services/filtering/filterConstants'
import { applyGameFilters } from '../../services/filtering/applyGameFilters'

export interface UseFiltersStateOptions {
  /** Games in the current session (before filtering) */
  sessionGames: GameRecord[]
  /** User ratings for low-rated filter */
  userRatings: Record<string, Record<number, number | undefined>>
  /** Initial filter values (for session restore) */
  initialFilters?: WizardFilters
}

export interface UseFiltersStateResult extends FiltersState, FiltersActions {}

export function useFiltersState(options: UseFiltersStateOptions): UseFiltersStateResult {
  const { sessionGames, userRatings, initialFilters } = options

  const [filters, setFilters] = useState<WizardFilters>(initialFilters ?? DEFAULT_FILTERS)

  // Derived: filtered games (session games after applying filters)
  const filteredGames = useMemo(() => {
    return applyGameFilters(sessionGames, filters, userRatings)
  }, [sessionGames, filters, userRatings])

  // ─────────────────────────────────────────────────────────────────────────
  // Filter Actions
  // ─────────────────────────────────────────────────────────────────────────
  const setPlayerCount = useCallback((count: number) => {
    setFilters((prev) => ({ ...prev, playerCount: count }))
  }, [])

  const setTimeRange = useCallback((range: { min: number; max: number }) => {
    setFilters((prev) => ({ ...prev, timeRange: range }))
  }, [])

  const setMode = useCallback((mode: 'coop' | 'competitive' | 'any') => {
    setFilters((prev) => ({ ...prev, mode }))
  }, [])

  const setExcludeLowRated = useCallback((threshold: number | null) => {
    setFilters((prev) => ({ ...prev, excludeLowRatedThreshold: threshold }))
  }, [])

  const setAgeRange = useCallback((range: { min: number; max: number }) => {
    setFilters((prev) => ({ ...prev, ageRange: range }))
  }, [])

  const setComplexityRange = useCallback((range: { min: number; max: number }) => {
    setFilters((prev) => ({ ...prev, complexityRange: range }))
  }, [])

  const setRatingRange = useCallback((range: { min: number; max: number }) => {
    setFilters((prev) => ({ ...prev, ratingRange: range }))
  }, [])

  return {
    // State
    filters,
    filteredGames,

    // Actions
    setPlayerCount,
    setTimeRange,
    setMode,
    setExcludeLowRated,
    setAgeRange,
    setComplexityRange,
    setRatingRange,
    setFilters,
  }
}
