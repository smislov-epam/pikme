/**
 * Hook for managing saved game nights in the wizard.
 * 
 * Single responsibility: Night persistence and loading saved nights.
 * 
 * ## Usage
 * 
 * ```ts
 * const { savedNights, saveNight, loadSavedNight, ... } = useSavedNightsState({
 *   recommendation,
 *   users,
 *   filters,
 *   sessionGameIds,
 *   excludedBggIds,
 * })
 * ```
 */
import { useState, useCallback, useEffect } from 'react'
import type { GameRecord, UserRecord, UserPreferenceRecord, SavedNightRecord } from '../../db/types'
import type { WizardFilters } from '../../store/wizardTypes'
import type { SavedNightsState, SavedNightsActions, RecommendationResult } from './types'
import * as dbService from '../../services/db'

export interface UseSavedNightsStateOptions {
  /** Current recommendation result */
  recommendation: RecommendationResult
  /** Current users in session */
  users: UserRecord[]
  /** Current filters */
  filters: WizardFilters
  /** Current session game IDs */
  sessionGameIds: number[]
  /** Current excluded game IDs */
  excludedBggIds: number[]
  /** Callback to load games and state when a night is loaded */
  onLoadNight?: (data: LoadedNightData) => void
}

export interface LoadedNightData {
  users: UserRecord[]
  games: GameRecord[]
  sessionGameIds: number[]
  gameOwners: Record<number, string[]>
  preferences: Record<string, UserPreferenceRecord[]>
  userRatings: Record<string, Record<number, number | undefined>>
}

export interface UseSavedNightsStateResult extends SavedNightsState, SavedNightsActions {}

export function useSavedNightsState(options: UseSavedNightsStateOptions): UseSavedNightsStateResult {
  const {
    recommendation,
    users,
    filters,
    sessionGameIds,
    excludedBggIds,
    onLoadNight,
  } = options

  const [savedNights, setSavedNights] = useState<SavedNightRecord[]>([])

  // Load saved nights on mount
  useEffect(() => {
    const load = async () => {
      try {
        const nights = await dbService.getSavedNights()
        setSavedNights(nights)
      } catch (err) {
        console.error('Failed to load saved nights:', err)
      }
    }
    load()
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────

  const saveNight = useCallback(
    async (name: string, description?: string, includeGuestUsernames?: string[]) => {
      if (!recommendation.topPick) return

      const excludedSet = new Set(excludedBggIds)
      const orgUsername = users.find((u) => u.isOrganizer)?.username
      const includeGuestSet = new Set(includeGuestUsernames ?? [])
      const usernamesToSave = users
        .filter((u) => !u.username.startsWith('__guest_') || includeGuestSet.has(u.username))
        .map((u) => u.username)

      await dbService.saveNight({
        name,
        description,
        organizerUsername: orgUsername,
        usernames: usernamesToSave,
        gameIds: sessionGameIds.filter((id) => !excludedSet.has(id)),
        filters: {
          playerCount: filters.playerCount,
          timeRange: filters.timeRange,
          mode: filters.mode,
          excludeLowRatedThreshold: filters.excludeLowRatedThreshold ?? undefined,
          ageRange: filters.ageRange,
          complexityRange: filters.complexityRange,
          ratingRange: filters.ratingRange,
        },
        pick: {
          bggId: recommendation.topPick.game.bggId,
          name: recommendation.topPick.game.name,
          score: recommendation.topPick.score,
        },
        alternatives: recommendation.alternatives.map((a) => ({
          bggId: a.game.bggId,
          name: a.game.name,
          score: a.score,
        })),
      })

      // Refresh saved nights
      const nights = await dbService.getSavedNights()
      setSavedNights(nights)
    },
    [recommendation, users, filters, sessionGameIds, excludedBggIds],
  )

  const loadSavedNights = useCallback(async () => {
    try {
      const nights = await dbService.getSavedNights()
      setSavedNights(nights)
    } catch (err) {
      console.error('Failed to load saved nights:', err)
    }
  }, [])

  const loadSavedNight = useCallback(
    async (id: number, options?: { includeGames?: boolean }) => {
      const includeGames = options?.includeGames ?? true
      
      try {
        const savedNight = await dbService.getSavedNight(id)
        if (!savedNight) {
          console.error('Saved night not found')
          return
        }

        const { data } = savedNight

        // Load users from saved night
        const loadedUsers: UserRecord[] = []
        for (const username of data.usernames) {
          let user = await dbService.getUser(username)
          if (!user) {
            user = await dbService.createLocalUser(username, username, loadedUsers.length === 0)
          }
          loadedUsers.push(user)
        }

        // Restore organizer
        if (data.organizerUsername) {
          await dbService.setUserAsOrganizer(data.organizerUsername)
          for (let i = 0; i < loadedUsers.length; i++) {
            loadedUsers[i] = {
              ...loadedUsers[i],
              isOrganizer: loadedUsers[i].username === data.organizerUsername,
            }
          }
        }

        // Load games only if includeGames is true
        let loadedGames: GameRecord[] = []
        let owners: Record<number, string[]> = {}
        let sessionGameIds: number[] = []
        if (includeGames && data.gameIds?.length) {
          loadedGames = await dbService.getGames(data.gameIds)
          owners = await dbService.getGameOwners(data.gameIds)
          sessionGameIds = data.gameIds
        }

        // Load preferences and ratings
        const prefsMap: Record<string, UserPreferenceRecord[]> = {}
        const ratingsMap: Record<string, Record<number, number | undefined>> = {}
        for (const user of loadedUsers) {
          prefsMap[user.username] = await dbService.getUserPreferences(user.username)
          const userGameRecords = await dbService.getUserGames(user.username)
          ratingsMap[user.username] = {}
          for (const ug of userGameRecords) {
            ratingsMap[user.username][ug.bggId] = ug.rating
          }
        }

        onLoadNight?.({
          users: loadedUsers,
          games: loadedGames,
          sessionGameIds,
          gameOwners: owners,
          preferences: prefsMap,
          userRatings: ratingsMap,
        })
      } catch (err) {
        console.error('Failed to load saved night:', err)
      }
    },
    [onLoadNight],
  )

  return {
    // State
    savedNights,

    // Actions
    saveNight,
    loadSavedNights,
    loadSavedNight,
  }
}
