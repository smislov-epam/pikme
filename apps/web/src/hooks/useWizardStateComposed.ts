/**
 * Wizard State Composer Hook
 * 
 * This hook composes all the individual wizard hooks into a unified interface.
 * It maintains backward compatibility with the original useWizardState API.
 * 
 * ## Architecture
 * 
 * The wizard state is split into focused, single-responsibility hooks:
 * - usePlayersState: User add/remove/organizer
 * - useGamesState: Game collection & session management
 * - useFiltersState: Filter configuration & derived filteredGames
 * - usePreferencesState: User preference rankings
 * - useRecommendationState: Borda count scoring
 * - useSavedNightsState: Night persistence
 * 
 * This composer wires them together and exposes a flat interface.
 */
import { useState, useCallback, useEffect } from 'react'
import type { UserRecord, UserPreferenceRecord, SavedNightRecord } from '../db/types'
import type { WizardFilters } from '../store/wizardTypes'
import { loadWizardState, saveWizardState, clearWizardState } from '../services/storage/wizardStateStorage'
import { loadLayoutMode, saveLayoutMode, type LayoutMode } from '../services/storage/uiPreferences'
import * as dbService from '../services/db'
import { getLocalOwner } from '../services/db/localOwnerService'
import { DEFAULT_FILTERS } from '../services/filtering/filterConstants'

// Import individual hooks
import { usePlayersState } from './wizard/usePlayersState'
import { useGamesState } from './wizard/useGamesState'
import { useFiltersState } from './wizard/useFiltersState'
import { usePreferencesState } from './wizard/usePreferencesState'
import { useRecommendationState } from './wizard/useRecommendationState'
import { useSavedNightsState } from './wizard/useSavedNightsState'

type PersistedWizardStateV1 = {
  version: 1
  usernames: string[]
  sessionGameIds: number[]
  excludedBggIds: number[]
  filters: WizardFilters
}

function isPersistedWizardStateV1(x: unknown): x is PersistedWizardStateV1 {
  if (!x || typeof x !== 'object') return false
  const obj = x as Record<string, unknown>
  return (
    obj.version === 1 &&
    Array.isArray(obj.usernames) &&
    Array.isArray(obj.sessionGameIds) &&
    Array.isArray(obj.excludedBggIds) &&
    typeof obj.filters === 'object' &&
    obj.filters !== null
  )
}

export function useWizardState() {
  // Shared state
  const [needsApiKey, setNeedsApiKey] = useState(false)
  const [layoutMode, setLayoutModeState] = useState<LayoutMode>(() => {
    try { return loadLayoutMode() } catch { return 'standard' }
  })
  const [savedNightsCache, setSavedNightsCache] = useState<SavedNightRecord[]>([])

  const setLayoutMode = useCallback((mode: LayoutMode) => {
    setLayoutModeState(mode)
    try { saveLayoutMode(mode) } catch { /* ignore */ }
  }, [])

  const clearNeedsApiKey = useCallback(() => setNeedsApiKey(false), [])

  // Games State
  const gamesState = useGamesState({
    onNeedsApiKey: () => setNeedsApiKey(true),
  })

  // Players State (manages users + userRatings)
  const playersState = usePlayersState({
    onNeedsApiKey: () => setNeedsApiKey(true),
    onUserAdded: async (_user, games, _ratings, _prefs, owners) => {
      if (games.length > 0) {
        gamesState.setGames((prev) => {
          const existingIds = new Set(prev.map((g) => g.bggId))
          return [...prev, ...games.filter((g) => !existingIds.has(g.bggId))]
        })
        gamesState.setGameOwners((prev) => ({ ...prev, ...owners }))
      }
    },
    onUserRemoved: (username) => {
      gamesState.setGameOwners((prev) => {
        const next: Record<number, string[]> = {}
        for (const [bggId, owners] of Object.entries(prev)) {
          const filtered = owners.filter((u) => u !== username)
          if (filtered.length > 0) next[Number(bggId)] = filtered
        }
        return next
      })
    },
  })

  // Filters State
  const filtersState = useFiltersState({
    sessionGames: gamesState.sessionGames,
    userRatings: playersState.userRatings,
  })

  // Preferences State
  const preferencesState = usePreferencesState({
    filteredGames: filtersState.filteredGames,
  })

  // Recommendation State
  const recommendationState = useRecommendationState({
    filteredGames: filtersState.filteredGames,
    preferences: preferencesState.preferences,
    users: playersState.users,
    filters: filtersState.filters,
  })

  // Saved Nights State
  const savedNightsState = useSavedNightsState({
    recommendation: recommendationState.recommendation,
    users: playersState.users,
    filters: filtersState.filters,
    sessionGameIds: gamesState.sessionGameIds,
    excludedBggIds: gamesState.excludedBggIds,
    onLoadNight: async (data) => {
      if (data.users.length > 0) playersState.setUsers(data.users)
      if (data.games.length > 0) {
        gamesState.setGames((prev) => {
          const existing = new Set(prev.map((g) => g.bggId))
          return [...prev, ...data.games.filter((g) => !existing.has(g.bggId))]
        })
        gamesState.setSessionGameIds(data.sessionGameIds)
        gamesState.setGameOwners((prev) => ({ ...prev, ...data.gameOwners }))
      }
      if (Object.keys(data.preferences).length > 0) {
        preferencesState.setPreferences(data.preferences)
      }
      if (Object.keys(data.userRatings).length > 0) {
        playersState.setUserRatings(data.userRatings)
      }
    },
  })

  // Load persisted state on mount
  useEffect(() => {
    const loadState = async () => {
      try {
        const persisted = await loadWizardState<unknown>()
        let hasLoadedUsers = false

        if (isPersistedWizardStateV1(persisted)) {
          filtersState.setFilters(persisted.filters)
          gamesState.setSessionGameIds(persisted.sessionGameIds)
          gamesState.setExcludedBggIds(persisted.excludedBggIds)

          if (persisted.usernames.length > 0) {
            hasLoadedUsers = true
            const loadedUsers: UserRecord[] = []
            for (const username of persisted.usernames) {
              let user = await dbService.getUser(username)
              if (user?.isDeleted) continue
              if (!user) {
                user = await dbService.createLocalUser(username, username, loadedUsers.length === 0)
              }
              loadedUsers.push(user)
            }
            playersState.setUsers(loadedUsers)

            const loadedGames = await dbService.getGamesForUsers(persisted.usernames)
            gamesState.setGames(loadedGames)
            gamesState.setGameOwners(await dbService.getGameOwners(loadedGames.map((g) => g.bggId)))

            const prefsMap: Record<string, UserPreferenceRecord[]> = {}
            const ratingsMap: Record<string, Record<number, number | undefined>> = {}
            for (const user of loadedUsers) {
              prefsMap[user.username] = await dbService.getUserPreferences(user.username)
              const ugRecords = await dbService.getUserGames(user.username)
              ratingsMap[user.username] = {}
              for (const ug of ugRecords) ratingsMap[user.username][ug.bggId] = ug.rating
            }
            preferencesState.setPreferences(prefsMap)
            playersState.setUserRatings(ratingsMap)
          }
        }

        // If no users were loaded from persisted state, add the local owner
        if (!hasLoadedUsers) {
          const localOwner = await getLocalOwner()
          if (localOwner) {
            playersState.setUsers([localOwner])
            // Load any existing games and preferences for the local owner
            const ownerGames = await dbService.getGamesForUsers([localOwner.username])
            if (ownerGames.length > 0) {
              gamesState.setGames(ownerGames)
              gamesState.setSessionGameIds(ownerGames.map((g) => g.bggId))
              gamesState.setGameOwners(
                await dbService.getGameOwners(ownerGames.map((g) => g.bggId))
              )
            }
            const ownerPrefs = await dbService.getUserPreferences(localOwner.username)
            if (ownerPrefs.length > 0) {
              preferencesState.setPreferences({ [localOwner.username]: ownerPrefs })
            }
            const ugRecords = await dbService.getUserGames(localOwner.username)
            if (ugRecords.length > 0) {
              const ratings: Record<number, number | undefined> = {}
              for (const ug of ugRecords) ratings[ug.bggId] = ug.rating
              playersState.setUserRatings({ [localOwner.username]: ratings })
            }
          }
        }

        playersState.setExistingLocalUsers(await dbService.getLocalUsers())
        setSavedNightsCache(await dbService.getSavedNights())
      } catch (err) {
        console.error('Failed to load wizard state:', err)
      }
    }
    loadState()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist state on change
  useEffect(() => {
    const handle = window.setTimeout(() => {
      void saveWizardState({
        version: 1,
        usernames: playersState.users.map((u) => u.username),
        sessionGameIds: gamesState.sessionGameIds,
        excludedBggIds: gamesState.excludedBggIds,
        filters: filtersState.filters,
      })
    }, 300)
    return () => window.clearTimeout(handle)
  }, [gamesState.excludedBggIds, gamesState.sessionGameIds, filtersState.filters, playersState.users])

  // Reset
  const reset = useCallback(() => {
    playersState.setUsers([])
    playersState.setUserRatings({})
    gamesState.setGames([])
    gamesState.setSessionGameIds([])
    gamesState.setExcludedBggIds([])
    gamesState.setGameOwners({})
    filtersState.setFilters(DEFAULT_FILTERS)
    preferencesState.setPreferences({})
    playersState.setUserError(null)
    void clearWizardState()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const savedNights = savedNightsState.savedNights.length > 0 
    ? savedNightsState.savedNights 
    : savedNightsCache

  // Return flat interface (backward compatible)
  return {
    // Players
    users: playersState.users,
    existingLocalUsers: playersState.existingLocalUsers,
    isLoadingUser: playersState.isLoadingUser,
    userError: playersState.userError,
    pendingBggUserNotFoundUsername: playersState.pendingBggUserNotFoundUsername,
    userRatings: playersState.userRatings,
    addBggUser: playersState.addBggUser,
    confirmAddBggUserAnyway: playersState.confirmAddBggUserAnyway,
    cancelAddBggUserAnyway: playersState.cancelAddBggUserAnyway,
    addLocalUser: playersState.addLocalUser,
    removeUser: playersState.removeUser,
    deleteUserPermanently: playersState.deleteUserPermanently,
    setOrganizer: playersState.setOrganizer,
    clearUserError: playersState.clearUserError,

    // Games
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

    // Filters
    filters: filtersState.filters,
    filteredGames: filtersState.filteredGames,
    setPlayerCount: filtersState.setPlayerCount,
    setTimeRange: filtersState.setTimeRange,
    setMode: filtersState.setMode,
    setExcludeLowRated: filtersState.setExcludeLowRated,
    setAgeRange: filtersState.setAgeRange,
    setComplexityRange: filtersState.setComplexityRange,
    setRatingRange: filtersState.setRatingRange,

    // Preferences
    preferences: preferencesState.preferences,
    updatePreference: preferencesState.updatePreference,
    clearPreference: preferencesState.clearPreference,
    reorderPreferences: preferencesState.reorderPreferences,
    autoSortByRating: preferencesState.autoSortByRating,
    markRestNeutral: preferencesState.markRestNeutral,

    // Recommendation
    recommendation: recommendationState.recommendation,
    computeRecommendation: () => {}, // No-op, computed reactively
    promoteAlternativeToTopPick: recommendationState.promoteAlternativeToTopPick,

    // Saved Nights
    savedNights,
    pendingReuseGamesNight: savedNightsState.pendingReuseGamesNight,
    saveNight: savedNightsState.saveNight,
    loadSavedNights: savedNightsState.loadSavedNights,
    loadSavedNight: savedNightsState.loadSavedNight,
    confirmReuseGamesFromNight: savedNightsState.confirmReuseGamesFromNight,
    dismissReuseGamesPrompt: savedNightsState.dismissReuseGamesPrompt,

    // Shared
    needsApiKey,
    layoutMode,
    clearNeedsApiKey,
    setLayoutMode,
    reset,
  }
}
