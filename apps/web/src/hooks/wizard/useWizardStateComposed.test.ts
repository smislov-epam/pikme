import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { UserRecord } from '../../db/types'

// Shared mocks so the hook can run without pulling real sub-hooks
const setUsers = vi.fn()
const setSessionGameIds = vi.fn()
const setExcludedBggIds = vi.fn()
const setGameOwners = vi.fn()
const setFilters = vi.fn()
const setPreferences = vi.fn()
const setUserRatings = vi.fn()

const mockFilters = {
  playerCount: 2,
  timeRange: { min: 0, max: 120 },
  mode: 'any' as const,
  requireBestWithPlayerCount: false,
  excludeLowRatedThreshold: null,
  ageRange: { min: 0, max: 21 },
  complexityRange: { min: 1, max: 5 },
  ratingRange: { min: 0, max: 10 },
}

vi.mock('../../services/db', () => ({
  getUser: vi.fn(),
  createLocalUser: vi.fn(),
  getGamesForUsers: vi.fn().mockResolvedValue([]),
  getUserGameIds: vi.fn().mockResolvedValue([]),
  getUserGames: vi.fn().mockResolvedValue([]),
  getUserPreferences: vi.fn().mockResolvedValue([]),
}))

vi.mock('./useGamesState', () => ({
  useGamesState: () => ({
    games: [],
    sessionGames: [],
    sessionGameIds: [],
    excludedBggIds: [],
    gameOwners: {},
    filteredGames: [],
    setGames: vi.fn(),
    setSessionGameIds,
    setExcludedBggIds,
    setGameOwners,
    searchGame: vi.fn(),
    addGameToUser: vi.fn(),
    removeGameFromUser: vi.fn(),
    addGameToSession: vi.fn(),
    removeGameFromSession: vi.fn(),
    excludeGameFromSession: vi.fn(),
    undoExcludeGameFromSession: vi.fn(),
    addOwnerToGame: vi.fn(),
    fetchGameInfo: vi.fn(),
    addGameManually: vi.fn(),
    updateGame: vi.fn(),
    refreshGameFromBgg: vi.fn(),
  }),
}))

vi.mock('./usePlayersState', () => ({
  usePlayersState: () => ({
    users: [],
    existingLocalUsers: [],
    isLoadingUser: false,
    userError: null,
    needsApiKey: false,
    pendingBggUserNotFoundUsername: null,
    userRatings: {},
    setUsers,
    setUserError: vi.fn(),
    addBggUser: vi.fn(),
    confirmAddBggUserAnyway: vi.fn(),
    cancelAddBggUserAnyway: vi.fn(),
    addLocalUser: vi.fn(),
    removeUser: vi.fn(),
    deleteUserPermanently: vi.fn(),
    setOrganizer: vi.fn(),
    clearUserError: vi.fn(),
    clearNeedsApiKey: vi.fn(),
  }),
}))

vi.mock('./useFiltersState', () => ({
  useFiltersState: () => ({
    filters: mockFilters,
    filteredGames: [],
    setFilters,
    setPlayerCount: vi.fn(),
    setTimeRange: vi.fn(),
    setMode: vi.fn(),
    setRequireBestWithPlayerCount: vi.fn(),
    setExcludeLowRated: vi.fn(),
    setAgeRange: vi.fn(),
    setComplexityRange: vi.fn(),
    setRatingRange: vi.fn(),
  }),
}))

vi.mock('./usePreferencesState', () => ({
  usePreferencesState: () => ({
    preferences: {},
    userRatings: {},
    setPreferences,
    setUserRatings,
    updatePreference: vi.fn(),
    clearPreference: vi.fn(),
    reorderPreferences: vi.fn(),
    autoSortByRating: vi.fn(),
    markRestNeutral: vi.fn(),
  }),
}))

vi.mock('./useRecommendationState', () => ({
  useRecommendationState: () => ({
    recommendation: { topPick: null, alternatives: [], vetoed: [] },
    computeRecommendation: vi.fn(),
    promoteAlternativeToTopPick: vi.fn(),
  }),
}))

vi.mock('./useSavedNightsState', () => ({
  useSavedNightsState: () => ({
    savedNights: [],
    saveNight: vi.fn(),
    loadSavedNights: vi.fn(),
    loadSavedNight: vi.fn(),
  }),
}))

import { useWizardStateComposed } from './useWizardStateComposed'
import * as dbService from '../../services/db'

describe('useWizardStateComposed.loadFromSessionState', () => {
  const db = vi.mocked(dbService)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('recreates missing local users and restores session game ids', async () => {
    const missingUser: UserRecord = {
      username: 'dana',
      internalId: 'dana-local',
      displayName: 'Dana',
      isBggUser: false,
      isOrganizer: false,
    }

    db.getUser.mockResolvedValueOnce(undefined)
    db.createLocalUser.mockResolvedValueOnce(missingUser)

    const { result } = renderHook(() => useWizardStateComposed())

    await act(async () => {
      await result.current.loadFromSessionState({
        usernames: ['dana'],
        sessionGameIds: [101],
        excludedBggIds: [],
        filters: mockFilters,
        preferences: {},
      })
    })

    expect(db.createLocalUser).toHaveBeenCalledWith('dana', 'dana', false)
    expect(setUsers).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ username: 'dana' })]))
    expect(setSessionGameIds).toHaveBeenCalledWith([101])
    expect(setFilters).toHaveBeenCalledWith(mockFilters)
  })
})
