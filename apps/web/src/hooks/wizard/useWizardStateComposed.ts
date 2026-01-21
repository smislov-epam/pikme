/**
 * Composed wizard state hook that combines all sub-hooks.
 * 
 * This is a thin orchestration layer that:
 * 1. Imports all modular sub-hooks (players, games, filters, preferences, etc.)
 * 2. Wires up callbacks for inter-hook coordination
 * 3. Handles persistence loading/saving
 * 4. Returns the combined interface for backward compatibility
 * 
 * @see usePlayersState - User management
 * @see useGamesState - Game collection and session
 * @see useFiltersState - Filter configuration
 * @see usePreferencesState - User preferences
 * @see useRecommendationState - Recommendation computation
 * @see useSavedNightsState - Saved game nights
 */
import { useCallback, useState } from 'react'
import type { UserRecord, UserPreferenceRecord } from '../../db/types'
import type { WizardFilters } from '../../store/wizardTypes'
import { usePlayersState } from './usePlayersState'
import { useGamesState } from './useGamesState'
import { useFiltersState } from './useFiltersState'
import { usePreferencesState } from './usePreferencesState'
import { useRecommendationState } from './useRecommendationState'
import { useSavedNightsState, type LoadedNightData } from './useSavedNightsState'
import { loadLayoutMode, saveLayoutMode, type LayoutMode } from '../../services/storage/uiPreferences'
import { DEFAULT_FILTERS } from '../../services/filtering/filterConstants'
import * as dbService from '../../services/db'

// Re-export types for consumers
export type { WizardState, WizardActions } from '../useWizardState'

/**
 * Composed wizard state hook - combines all sub-hooks into unified interface.
 * 
 * This maintains the same interface as the original useWizardState for
 * backward compatibility while delegating to modular sub-hooks.
 */
export function useWizardStateComposed() {
  // ─────────────────────────────────────────────────────────────────────────
  // UI State (not in sub-hooks)
  // ─────────────────────────────────────────────────────────────────────────
  const [layoutMode, setLayoutModeState] = useState<LayoutMode>(() => {
    try {
      return loadLayoutMode()
    } catch {
      return 'standard'
    }
  })

  const setLayoutMode = useCallback((mode: LayoutMode) => {
    setLayoutModeState(mode)
    try {
      saveLayoutMode(mode)
    } catch {
      // ignore
    }
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // Games State (must be first - other hooks depend on it)
  // ─────────────────────────────────────────────────────────────────────────
  const gamesState = useGamesState({
    onNeedsApiKey: () => playersState.clearNeedsApiKey(), // will be set below
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Players State (with callbacks to games state)
  // ─────────────────────────────────────────────────────────────────────────
  const playersState = usePlayersState({
    onUserAdded: (user, userGames, ratings, prefs, owners) => {
      // Add user's games to collection
      gamesState.setGames((prev) => {
        const existingIds = new Set(prev.map((g) => g.bggId))
        const newGames = userGames.filter((g) => !existingIds.has(g.bggId))
        return [...prev, ...newGames]
      })
      // Update game owners
      gamesState.setGameOwners((prev) => ({ ...prev, ...owners }))
      // Add user's ratings
      preferencesState.setUserRatings((prev) => ({
        ...prev,
        [user.username]: ratings,
      }))
      // Add user's preferences
      preferencesState.setPreferences((prev) => ({
        ...prev,
        [user.username]: prefs,
      }))
    },
    onUserRemoved: (username) => {
      // Clean up preferences
      preferencesState.setPreferences((prev) => {
        const next = { ...prev }
        delete next[username]
        return next
      })
      preferencesState.setUserRatings((prev) => {
        const next = { ...prev }
        delete next[username]
        return next
      })
      // Clean up game owners
      gamesState.setGameOwners((prev) => {
        const next: Record<number, string[]> = {}
        for (const [bggId, owners] of Object.entries(prev)) {
          const filtered = owners.filter((u) => u !== username)
          if (filtered.length > 0) {
            next[Number(bggId)] = filtered
          }
        }
        return next
      })
    },
    onNeedsApiKey: () => {
      // Already handled by players state internally
    },
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Filters State
  // ─────────────────────────────────────────────────────────────────────────
  const filtersState = useFiltersState({
    sessionGames: gamesState.sessionGames,
    userRatings: playersState.userRatings,
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Preferences State
  // ─────────────────────────────────────────────────────────────────────────
  const preferencesState = usePreferencesState({
    filteredGames: filtersState.filteredGames,
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Recommendation State
  // ─────────────────────────────────────────────────────────────────────────
  const recommendationState = useRecommendationState({
    filteredGames: filtersState.filteredGames,
    preferences: preferencesState.preferences,
    users: playersState.users,
    filters: filtersState.filters,
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Saved Nights State
  // ─────────────────────────────────────────────────────────────────────────
  const savedNightsState = useSavedNightsState({
    recommendation: recommendationState.recommendation,
    users: playersState.users,
    filters: filtersState.filters,
    sessionGameIds: gamesState.sessionGameIds,
    excludedBggIds: gamesState.excludedBggIds,
    onLoadNight: (data: LoadedNightData) => {
      playersState.setUsers(data.users)
      gamesState.setGames(data.games)
      gamesState.setSessionGameIds(data.sessionGameIds)
      gamesState.setGameOwners(data.gameOwners)
      preferencesState.setPreferences(data.preferences)
      preferencesState.setUserRatings(data.userRatings)
    },
  })

  // NOTE: We intentionally do NOT persist session selections (players, filters, session games)
  // in the global wizard state. Those are captured when the user chooses to Share/Create invites.

  // ─────────────────────────────────────────────────────────────────────────
  // Reset and Session Management
  // ─────────────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    playersState.setUsers([])
    gamesState.setGames([])
    gamesState.setSessionGameIds([])
    gamesState.setExcludedBggIds([])
    gamesState.setGameOwners({})
    filtersState.setFilters(DEFAULT_FILTERS)
    preferencesState.setPreferences({})
    preferencesState.setUserRatings({})
    playersState.setUserError(null)
  }, [playersState, gamesState, filtersState, preferencesState])

  const resetForNewSession = useCallback(() => {
    playersState.setUsers([])
    gamesState.setSessionGameIds([])
    gamesState.setExcludedBggIds([])
    gamesState.setGameOwners({})
    filtersState.setFilters(DEFAULT_FILTERS)
    preferencesState.setPreferences({})
    preferencesState.setUserRatings({})
    playersState.setUserError(null)
  }, [playersState, gamesState, filtersState, preferencesState])

  const loadFromSessionState = useCallback(
    async (state: {
      usernames: string[]
      sessionGameIds: number[]
      excludedBggIds: number[]
      filters: WizardFilters
      preferences: Record<string, Array<{
        bggId: number
        rank?: number
        isTopPick: boolean
        isDisliked: boolean
      }>>
    }) => {
      // Load users from DB, materializing missing locals so we don't drop participants
      const loadedUsers: UserRecord[] = []
      for (const username of state.usernames) {
        let user = await dbService.getUser(username)
        if (!user) {
          user = await dbService.createLocalUser(username, username, false)
        }
        loadedUsers.push(user)
      }
      playersState.setUsers(loadedUsers)
      gamesState.setSessionGameIds(state.sessionGameIds)
      gamesState.setExcludedBggIds(state.excludedBggIds)
      filtersState.setFilters(state.filters)

      // Load games collection for these users from DB
      // This ensures the games array has all games needed for sessionGameIds
      if (loadedUsers.length > 0) {
        const loadedGames = await dbService.getGamesForUsers(loadedUsers.map(u => u.username))
        gamesState.setGames(loadedGames)
      }

      // Rebuild game owners
      const owners: Record<number, string[]> = {}
      for (const user of loadedUsers) {
        const userGameIds = await dbService.getUserGameIds(user.username)
        for (const gid of userGameIds) {
          if (!owners[gid]) owners[gid] = []
          if (!owners[gid].includes(user.username)) {
            owners[gid].push(user.username)
          }
        }
      }
      gamesState.setGameOwners(owners)

      // Load user ratings from DB for proper display
      const ratingsMap: Record<string, Record<number, number | undefined>> = {}
      for (const user of loadedUsers) {
        const userGameRecords = await dbService.getUserGames(user.username)
        ratingsMap[user.username] = {}
        for (const ug of userGameRecords) {
          ratingsMap[user.username][ug.bggId] = ug.rating
        }
      }
      preferencesState.setUserRatings(ratingsMap)

      // Load preferences from Dexie (the source of truth) for each user.
      // We do NOT use the snapshot preferences because Dexie has the most
      // up-to-date data (user may have edited preferences without saving snapshot).
      const fullPrefs: Record<string, UserPreferenceRecord[]> = {}
      for (const user of loadedUsers) {
        const userPrefs = await dbService.getUserPreferences(user.username)
        fullPrefs[user.username] = userPrefs
      }
      preferencesState.setPreferences(fullPrefs)
      playersState.setUserError(null)
    },
    [playersState, gamesState, filtersState, preferencesState],
  )

  // ─────────────────────────────────────────────────────────────────────────
  // Return combined interface (backward compatible)
  // ─────────────────────────────────────────────────────────────────────────
  return {
    // Players state
    users: playersState.users,
    existingLocalUsers: playersState.existingLocalUsers,
    isLoadingUser: playersState.isLoadingUser,
    userError: playersState.userError,
    needsApiKey: playersState.needsApiKey,
    pendingBggUserNotFoundUsername: playersState.pendingBggUserNotFoundUsername,
    addBggUser: playersState.addBggUser,
    confirmAddBggUserAnyway: playersState.confirmAddBggUserAnyway,
    cancelAddBggUserAnyway: playersState.cancelAddBggUserAnyway,
    addLocalUser: playersState.addLocalUser,
    removeUser: playersState.removeUser,
    deleteUserPermanently: playersState.deleteUserPermanently,
    setOrganizer: playersState.setOrganizer,
    clearUserError: playersState.clearUserError,
    clearNeedsApiKey: playersState.clearNeedsApiKey,

    // Games state
    games: gamesState.games,
    sessionGameIds: gamesState.sessionGameIds,
    excludedBggIds: gamesState.excludedBggIds,
    gameOwners: gamesState.gameOwners,
    sessionGames: gamesState.sessionGames,
    searchGame: gamesState.searchGame,
    addGameToUser: gamesState.addGameToUser,
    removeGameFromUser: gamesState.removeGameFromUser,
    addGameToSession: gamesState.addGameToSession,
    removeGameFromSession: gamesState.removeGameFromSession,
    excludeGameFromSession: gamesState.excludeGameFromSession,
    undoExcludeGameFromSession: gamesState.undoExcludeGameFromSession,
    addOwnerToGame: gamesState.addOwnerToGame,
    fetchGameInfo: gamesState.fetchGameInfo,
    addGameManually: gamesState.addGameManually,
    updateGame: gamesState.updateGame,
    refreshGameFromBgg: gamesState.refreshGameFromBgg,

    // Filters state
    filters: filtersState.filters,
    filteredGames: filtersState.filteredGames,
    setPlayerCount: filtersState.setPlayerCount,
    setTimeRange: filtersState.setTimeRange,
    setMode: filtersState.setMode,
    setRequireBestWithPlayerCount: filtersState.setRequireBestWithPlayerCount,
    setExcludeLowRated: filtersState.setExcludeLowRated,
    setAgeRange: filtersState.setAgeRange,
    setComplexityRange: filtersState.setComplexityRange,
    setRatingRange: filtersState.setRatingRange,

    // Preferences state
    preferences: preferencesState.preferences,
    userRatings: playersState.userRatings, // From players for coordination
    updatePreference: preferencesState.updatePreference,
    clearPreference: preferencesState.clearPreference,
    reorderPreferences: preferencesState.reorderPreferences,
    autoSortByRating: preferencesState.autoSortByRating,
    markRestNeutral: preferencesState.markRestNeutral,

    // Recommendation state
    recommendation: recommendationState.recommendation,
    promotedPickBggId: recommendationState.promotedPickBggId,
    computeRecommendation: recommendationState.computeRecommendation,
    promoteAlternativeToTopPick: recommendationState.promoteAlternativeToTopPick,

    // Saved nights state
    savedNights: savedNightsState.savedNights,
    saveNight: savedNightsState.saveNight,
    loadSavedNights: savedNightsState.loadSavedNights,
    loadSavedNight: savedNightsState.loadSavedNight,

    // UI state
    layoutMode,
    setLayoutMode,

    // Session management
    reset,
    resetForNewSession,
    loadFromSessionState,
  }
}
