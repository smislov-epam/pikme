/**
 * Hook for managing user preferences in the wizard.
 * 
 * Single responsibility: Preference rankings, top picks, dislikes, and ratings.
 * 
 * ## Usage
 * 
 * ```ts
 * const { preferences, userRatings, updatePreference, ... } = usePreferencesState({
 *   filteredGames,
 *   initialPreferences,
 *   initialRatings,
 * })
 * ```
 */
import { useState, useCallback } from 'react'
import type { GameRecord, UserPreferenceRecord } from '../../db/types'
import type { PreferencesState, PreferencesActions, PreferenceUpdate } from './types'
import * as dbService from '../../services/db'
import { normalizePreferenceUpdate } from '../../services/preferences/preferenceRules'

export interface UsePreferencesStateOptions {
  /** Filtered games (for autoSortByRating) */
  filteredGames: GameRecord[]
  /** Initial preferences (for session restore) */
  initialPreferences?: Record<string, UserPreferenceRecord[]>
  /** Initial ratings (for session restore) */
  initialRatings?: Record<string, Record<number, number | undefined>>
}

export interface UsePreferencesStateResult extends PreferencesState, PreferencesActions {}

export function usePreferencesState(options: UsePreferencesStateOptions): UsePreferencesStateResult {
  const { filteredGames, initialPreferences, initialRatings } = options

  const [preferences, setPreferences] = useState<Record<string, UserPreferenceRecord[]>>(
    initialPreferences ?? {},
  )
  const [userRatings, setUserRatings] = useState<Record<string, Record<number, number | undefined>>>(
    initialRatings ?? {},
  )

  // ─────────────────────────────────────────────────────────────────────────
  // Preference Actions
  // ─────────────────────────────────────────────────────────────────────────

  const updatePreference = useCallback(
    async (username: string, bggId: number, update: PreferenceUpdate) => {
      await dbService.updateGamePreference(username, bggId, update)

      setPreferences((prev) => {
        const now = new Date().toISOString()
        const userPrefs = [...(prev[username] ?? [])]
        const existingIndex = userPrefs.findIndex((p) => p.bggId === bggId)

        if (existingIndex >= 0) {
          const existing = userPrefs[existingIndex]
          const normalized = normalizePreferenceUpdate(existing, update)
          userPrefs[existingIndex] = { ...existing, ...normalized, updatedAt: now }
        } else {
          const normalized = normalizePreferenceUpdate(undefined, update)
          userPrefs.push({
            username,
            bggId,
            rank: normalized.rank,
            isTopPick: normalized.isTopPick,
            isDisliked: normalized.isDisliked,
            updatedAt: now,
          })
        }

        return { ...prev, [username]: userPrefs }
      })
    },
    [],
  )

  const clearPreference = useCallback(async (username: string, bggId: number) => {
    await dbService.deleteUserPreference(username, bggId)
    setPreferences((prev) => {
      const userPrefs = prev[username] ?? []
      return { ...prev, [username]: userPrefs.filter((p) => p.bggId !== bggId) }
    })
  }, [])

  const reorderPreferences = useCallback((username: string, orderedBggIds: number[]) => {
    const now = new Date().toISOString()

    // Update UI immediately (optimistic) so drag doesn't snap back
    setPreferences((prev) => {
      const existing = prev[username] ?? []
      const orderedSet = new Set(orderedBggIds)
      const existingById = new Map(existing.map((p) => [p.bggId, p]))

      // Update existing records
      const updatedExisting = existing.map((p) => {
        const newIndex = orderedBggIds.indexOf(p.bggId)
        if (newIndex !== -1) {
          return { ...p, rank: newIndex + 1, isTopPick: false, isDisliked: false, updatedAt: now }
        }
        if (p.rank !== undefined && !orderedSet.has(p.bggId)) {
          return { ...p, rank: undefined, updatedAt: now }
        }
        return p
      })

      // Add missing records for newly ranked items
      const additions = orderedBggIds
        .filter((bggId) => !existingById.has(bggId))
        .map((bggId, index) => ({
          username,
          bggId,
          rank: index + 1,
          isTopPick: false,
          isDisliked: false,
          updatedAt: now,
        }))

      return { ...prev, [username]: [...updatedExisting, ...additions] }
    })

    // Persist in background
    void dbService.setUserPreferenceRanks(username, orderedBggIds).catch((err) => {
      console.error('Failed to persist preference ranks:', err)
    })
  }, [])

  const autoSortByRating = useCallback(
    async (username: string) => {
      const ratings = userRatings[username] ?? {}
      const existingPrefs = preferences[username] ?? []
      const dislikedIds = new Set(existingPrefs.filter((p) => p.isDisliked).map((p) => p.bggId))

      const gamesWithRatings = filteredGames
        .filter((g) => ratings[g.bggId] !== undefined)
        .filter((g) => !dislikedIds.has(g.bggId))
        .sort((a, b) => (ratings[b.bggId] ?? 0) - (ratings[a.bggId] ?? 0))

      const rankedPrefs = gamesWithRatings.map((game, index) => ({
        bggId: game.bggId,
        rank: index < 3 ? undefined : index - 2,
        isTopPick: index < 3,
        isDisliked: false,
      }))

      const dislikedPrefs = [...dislikedIds].map((bggId) => ({
        bggId,
        rank: undefined,
        isTopPick: false,
        isDisliked: true,
      }))

      const newPrefs = [...rankedPrefs, ...dislikedPrefs]

      await dbService.saveUserPreferences(username, newPrefs)

      setPreferences((prev) => ({
        ...prev,
        [username]: newPrefs.map((p) => ({
          username,
          bggId: p.bggId,
          rank: p.rank,
          isTopPick: p.isTopPick,
          isDisliked: p.isDisliked,
          updatedAt: new Date().toISOString(),
        })),
      }))
    },
    [filteredGames, userRatings, preferences],
  )

  const markRestNeutral = useCallback(async (username: string) => {
    await dbService.clearUserPreferences(username)
    setPreferences((prev) => ({ ...prev, [username]: [] }))
  }, [])

  return {
    // State
    preferences,
    userRatings,

    // Actions
    updatePreference,
    clearPreference,
    reorderPreferences,
    autoSortByRating,
    markRestNeutral,
    setPreferences,
    setUserRatings,
  }
}
