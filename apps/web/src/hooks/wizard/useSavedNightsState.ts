/**
 * Hook for managing saved game nights in the wizard.
 * 
 * Single responsibility: Night persistence, reuse prompts, loading saved nights.
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
import { useState, useCallback, useEffect, useMemo } from 'react'
import type { GameRecord, UserRecord, UserPreferenceRecord, SavedNightRecord } from '../../db/types'
import type { WizardFilters } from '../../store/wizardTypes'
import type { SavedNightsState, SavedNightsActions, RecommendationResult, PendingReuseNight } from './types'
import * as dbService from '../../services/db'
import { findReusableNight } from '../../services/savedNights/findReusableNight'

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
  const [pendingReuseGamesNightId, setPendingReuseGamesNightId] = useState<number | null>(null)
  const [dismissedReuseGamesNightId, setDismissedReuseGamesNightId] = useState<number | null>(null)

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

  const organizerUsername = useMemo(
    () => users.find((u) => u.isOrganizer)?.username ?? null,
    [users],
  )

  // Derived: pending reuse night info
  const pendingReuseGamesNight = useMemo((): PendingReuseNight | null => {
    if (!pendingReuseGamesNightId) return null
    const match = savedNights.find((n) => n.id === pendingReuseGamesNightId)
    if (!match) return null
    return {
      id: pendingReuseGamesNightId,
      name: match.data.name,
      gameCount: (match.data.gameIds ?? []).length,
    }
  }, [pendingReuseGamesNightId, savedNights])

  // Check for reusable night when session is empty
  useEffect(() => {
    if (sessionGameIds.length > 0) return

    const match = findReusableNight({
      savedNights,
      organizerUsername,
      playerCount: users.length,
    })

    if (!match?.id) {
      setPendingReuseGamesNightId(null)
      return
    }

    if (dismissedReuseGamesNightId === match.id) return
    setPendingReuseGamesNightId(match.id)
  }, [dismissedReuseGamesNightId, organizerUsername, savedNights, sessionGameIds.length, users.length])

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────

  const saveNight = useCallback(
    async (name: string, description?: string) => {
      if (!recommendation.topPick) return

      const excludedSet = new Set(excludedBggIds)
      const orgUsername = users.find((u) => u.isOrganizer)?.username

      await dbService.saveNight({
        name,
        description,
        organizerUsername: orgUsername,
        usernames: users.map((u) => u.username),
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
    async (id: number) => {
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

        // Load games
        let loadedGames: GameRecord[] = []
        let owners: Record<number, string[]> = {}
        if (data.gameIds?.length) {
          loadedGames = await dbService.getGames(data.gameIds)
          owners = await dbService.getGameOwners(data.gameIds)
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
          sessionGameIds: data.gameIds ?? [],
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

  const confirmReuseGamesFromNight = useCallback(async () => {
    const nightId = pendingReuseGamesNightId
    if (!nightId) return

    const night = savedNights.find((n) => n.id === nightId)
    const gameIds = night?.data.gameIds ?? []
    if (gameIds.length === 0) {
      setPendingReuseGamesNightId(null)
      return
    }

    try {
      const loadedGames = await dbService.getGames(gameIds)
      const owners = await dbService.getGameOwners(gameIds)

      onLoadNight?.({
        users: [], // Don't override users, just add games
        games: loadedGames,
        sessionGameIds: gameIds,
        gameOwners: owners,
        preferences: {},
        userRatings: {},
      })
    } catch (err) {
      console.error('Failed to load games from previous night:', err)
    } finally {
      setPendingReuseGamesNightId(null)
    }
  }, [pendingReuseGamesNightId, savedNights, onLoadNight])

  const dismissReuseGamesPrompt = useCallback(() => {
    setDismissedReuseGamesNightId(pendingReuseGamesNightId)
    setPendingReuseGamesNightId(null)
  }, [pendingReuseGamesNightId])

  return {
    // State
    savedNights,
    pendingReuseGamesNight,

    // Actions
    saveNight,
    loadSavedNights,
    loadSavedNight,
    confirmReuseGamesFromNight,
    dismissReuseGamesPrompt,
  }
}
