import { describe, expect, it } from 'vitest'
import type { GameRecord, UserPreferenceRecord, UserRecord } from '../../db/types'
import type { WizardActions, WizardState } from '../../hooks/useWizardState'
import { getWizardViewForSession } from './getWizardViewForSession'

function createBaseWizard(args: {
  filteredGames: GameRecord[]
  users: UserRecord[]
  preferences: Record<string, UserPreferenceRecord[]>
}): WizardState & WizardActions {
  const { filteredGames, users, preferences } = args

  // Minimal-but-valid WizardState & WizardActions for this unit.
  return {
    users,
    games: filteredGames,
    sessionGameIds: filteredGames.map((g) => g.bggId),
    excludedBggIds: [],
    gameOwners: {},
    existingLocalUsers: [],
    isLoadingUser: false,
    userError: null,
    needsApiKey: false,
    pendingBggUserNotFoundUsername: null,

    filters: {
      playerCount: 4,
      timeRange: { min: 0, max: 999 },
      mode: 'any',
      requireBestWithPlayerCount: false,
      excludeLowRatedThreshold: null,
      ageRange: { min: 0, max: 99 },
      complexityRange: { min: 0, max: 5 },
      ratingRange: { min: 0, max: 10 },
    },

    sessionGames: filteredGames,
    filteredGames,

    preferences,
    userRatings: {},

    recommendation: { topPick: null, alternatives: [], vetoed: [] },
    promotedPickBggId: null,

    layoutMode: 'standard',

    // Actions (not used by this test)
    addBggUser: async () => {},
    confirmAddBggUserAnyway: async () => {},
    cancelAddBggUserAnyway: () => {},
    addLocalUser: async () => {},
    removeUser: () => {},
    deleteUserPermanently: async () => {},
    setOrganizer: async () => {},
    setExistingLocalUsers: () => {},
    searchGame: async () => [],
    addGameToUser: async () => {},
    removeGameFromUser: async () => {},
    addGameToSession: () => {},
    removeGameFromSession: () => {},
    excludeGameFromSession: () => {},
    undoExcludeGameFromSession: () => {},
    addOwnerToGame: async () => {},
    fetchGameInfo: async () => ({ bggId: 0 }),
    addGameManually: async () => {},
    updateGame: async () => {},
    refreshGameFromBgg: async () => ({
      bggId: 0,
      name: 'x',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as GameRecord),

    setPlayerCount: () => {},
    setTimeRange: () => {},
    setMode: () => {},
    setRequireBestWithPlayerCount: () => {},
    setExcludeLowRated: () => {},
    setAgeRange: () => {},
    setComplexityRange: () => {},
    setRatingRange: () => {},

    updatePreference: () => {},
    clearPreference: () => {},
    reorderPreferences: () => {},
    autoSortByRating: () => {},
    markRestNeutral: () => {},

    computeRecommendation: () => {},
    promoteAlternativeToTopPick: () => {},
    saveNight: async () => {},

    savedNights: [],
    loadSavedNights: async () => {},
    loadSavedNight: async () => {},

    reset: () => {},
    resetForNewSession: () => {},
    loadFromSessionState: async () => {},

    clearUserError: () => {},
    clearNeedsApiKey: () => {},

    setLayoutMode: () => {},
  }
}

describe('getWizardViewForSession', () => {
  it('recomputes recommendation using merged guest preferences (including dislikes)', () => {
    const games: GameRecord[] = [
      {
        bggId: 1,
        name: 'A',
        lastFetchedAt: new Date().toISOString(),
      } as GameRecord,
      {
        bggId: 2,
        name: 'B',
        lastFetchedAt: new Date().toISOString(),
      } as GameRecord,
    ]

    const host: UserRecord = {
      username: 'host',
      internalId: 'host-123',
      displayName: 'Host',
      isBggUser: false,
      isLocalOwner: true,
      isOrganizer: true,
    }

    const guest: UserRecord = {
      username: '__guest_1',
      internalId: 'guest-456',
      displayName: 'Guest',
      isBggUser: false,
      isLocalOwner: false,
      isOrganizer: false,
    }

    const hostPrefs: UserPreferenceRecord[] = [
      { username: host.username, bggId: 1, isTopPick: true, isDisliked: false, updatedAt: '' },
    ]

    const mergedPrefs: Record<string, UserPreferenceRecord[]> = {
      [host.username]: hostPrefs,
      [guest.username]: [
        // Guest vetoes game 1, and ranks game 2.
        { username: guest.username, bggId: 1, isTopPick: false, isDisliked: true, updatedAt: '' },
        { username: guest.username, bggId: 2, rank: 1, isTopPick: false, isDisliked: false, updatedAt: '' },
      ],
    }

    const baseWizard = createBaseWizard({
      filteredGames: games,
      users: [host],
      preferences: { [host.username]: hostPrefs },
    })

    const view = getWizardViewForSession({
      wizard: baseWizard,
      activeSessionId: 's1',
      mergedUsers: [host, guest],
      mergedPreferences: mergedPrefs,
    })

    // With merged prefs, game 1 should be vetoed and game 2 should become top pick.
    expect(view.recommendation.vetoed.length).toBe(1)
    expect(view.recommendation.vetoed[0]?.game.bggId).toBe(1)
    expect(view.recommendation.topPick?.game.bggId).toBe(2)
  })

  it('is a no-op when there is no active session', () => {
    const games: GameRecord[] = [
      {
        bggId: 1,
        name: 'A',
        lastFetchedAt: new Date().toISOString(),
      } as GameRecord,
    ]

    const host: UserRecord = {
      username: 'host',
      internalId: 'host-123',
      displayName: 'Host',
      isBggUser: false,
      isLocalOwner: true,
      isOrganizer: true,
    }

    const baseWizard = createBaseWizard({
      filteredGames: games,
      users: [host],
      preferences: { [host.username]: [] },
    })

    const view = getWizardViewForSession({
      wizard: baseWizard,
      activeSessionId: null,
      mergedUsers: [host],
      mergedPreferences: { [host.username]: [] },
    })

    expect(view).toBe(baseWizard)
  })
})
