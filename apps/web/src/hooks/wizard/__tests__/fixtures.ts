/**
 * Shared test fixtures for wizard hooks.
 * 
 * Provides consistent mock data for testing all wizard-related hooks.
 * Import these fixtures to avoid duplicating test data across test files.
 */
import type { GameRecord, UserRecord, UserPreferenceRecord, SavedNightRecord } from '../../../db/types'
import type { WizardFilters } from '../../../store/wizardTypes'

// ─────────────────────────────────────────────────────────────────────────────
// Mock Users
// ─────────────────────────────────────────────────────────────────────────────
export const mockUsers: UserRecord[] = [
  {
    username: 'alice',
    internalId: 'alice-abc123',
    displayName: 'Alice',
    isBggUser: true,
    isOrganizer: true,
    lastSyncAt: '2026-01-10T10:00:00Z',
    ownedCount: 25,
    isDeleted: false,
  },
  {
    username: 'bob',
    internalId: 'bob-def456',
    displayName: 'Bob',
    isBggUser: false,
    isOrganizer: false,
    isDeleted: false,
  },
  {
    username: 'charlie',
    internalId: 'charlie-ghi789',
    displayName: 'Charlie',
    isBggUser: true,
    isOrganizer: false,
    lastSyncAt: '2026-01-12T14:30:00Z',
    ownedCount: 15,
    isDeleted: false,
  },
]

export const mockOrganizer = mockUsers[0]
export const mockLocalUser = mockUsers[1]

// ─────────────────────────────────────────────────────────────────────────────
// Mock Games
// ─────────────────────────────────────────────────────────────────────────────
export const mockGames: GameRecord[] = [
  {
    bggId: 174430,
    name: 'Gloomhaven',
    yearPublished: 2017,
    thumbnail: 'https://example.com/gloomhaven.jpg',
    minPlayers: 1,
    maxPlayers: 4,
    bestWith: '3',
    playingTimeMinutes: 120,
    minPlayTimeMinutes: 60,
    maxPlayTimeMinutes: 150,
    minAge: 14,
    mechanics: ['Cooperative Game', 'Hand Management', 'Modular Board'],
    categories: ['Adventure', 'Fantasy'],
    averageRating: 8.7,
    weight: 3.86,
    lastFetchedAt: '2026-01-10T10:00:00Z',
  },
  {
    bggId: 167791,
    name: 'Terraforming Mars',
    yearPublished: 2016,
    thumbnail: 'https://example.com/terraforming.jpg',
    minPlayers: 1,
    maxPlayers: 5,
    bestWith: '4',
    playingTimeMinutes: 120,
    minPlayTimeMinutes: 90,
    maxPlayTimeMinutes: 180,
    minAge: 12,
    mechanics: ['Hand Management', 'Tile Placement', 'Variable Player Powers'],
    categories: ['Economic', 'Science Fiction'],
    averageRating: 8.4,
    weight: 3.24,
    lastFetchedAt: '2026-01-10T10:00:00Z',
  },
  {
    bggId: 230802,
    name: 'Azul',
    yearPublished: 2017,
    thumbnail: 'https://example.com/azul.jpg',
    minPlayers: 2,
    maxPlayers: 4,
    bestWith: '2',
    playingTimeMinutes: 45,
    minPlayTimeMinutes: 30,
    maxPlayTimeMinutes: 45,
    minAge: 8,
    mechanics: ['Pattern Building', 'Tile Placement'],
    categories: ['Abstract Strategy'],
    averageRating: 7.8,
    weight: 1.77,
    lastFetchedAt: '2026-01-10T10:00:00Z',
  },
  {
    bggId: 266192,
    name: 'Wingspan',
    yearPublished: 2019,
    thumbnail: 'https://example.com/wingspan.jpg',
    minPlayers: 1,
    maxPlayers: 5,
    bestWith: '3',
    playingTimeMinutes: 70,
    minPlayTimeMinutes: 40,
    maxPlayTimeMinutes: 70,
    minAge: 10,
    mechanics: ['Card Drafting', 'Hand Management', 'Engine Building'],
    categories: ['Animals', 'Card Game'],
    averageRating: 8.1,
    weight: 2.44,
    lastFetchedAt: '2026-01-10T10:00:00Z',
  },
  {
    bggId: 161936,
    name: 'Pandemic Legacy: Season 1',
    yearPublished: 2015,
    thumbnail: 'https://example.com/pandemic.jpg',
    minPlayers: 2,
    maxPlayers: 4,
    bestWith: '4',
    playingTimeMinutes: 60,
    minPlayTimeMinutes: 60,
    maxPlayTimeMinutes: 60,
    minAge: 13,
    mechanics: ['Cooperative Game', 'Hand Management', 'Set Collection'],
    categories: ['Medical'],
    averageRating: 8.5,
    weight: 2.83,
    lastFetchedAt: '2026-01-10T10:00:00Z',
  },
]

export const mockCoopGame = mockGames[0] // Gloomhaven
export const mockCompetitiveGame = mockGames[1] // Terraforming Mars
export const mockQuickGame = mockGames[2] // Azul

// ─────────────────────────────────────────────────────────────────────────────
// Mock Preferences
// ─────────────────────────────────────────────────────────────────────────────
export const mockPreferences: Record<string, UserPreferenceRecord[]> = {
  'alice': [
    { username: 'alice', bggId: 174430, rank: undefined, isTopPick: true, isDisliked: false, updatedAt: '2026-01-10T10:00:00Z' },
    { username: 'alice', bggId: 167791, rank: 1, isTopPick: false, isDisliked: false, updatedAt: '2026-01-10T10:00:00Z' },
    { username: 'alice', bggId: 230802, rank: 2, isTopPick: false, isDisliked: false, updatedAt: '2026-01-10T10:00:00Z' },
  ],
  'bob': [
    { username: 'bob', bggId: 266192, rank: undefined, isTopPick: true, isDisliked: false, updatedAt: '2026-01-10T10:00:00Z' },
    { username: 'bob', bggId: 174430, rank: 1, isTopPick: false, isDisliked: false, updatedAt: '2026-01-10T10:00:00Z' },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Ratings
// ─────────────────────────────────────────────────────────────────────────────
export const mockUserRatings: Record<string, Record<number, number | undefined>> = {
  'alice': {
    174430: 9.5,
    167791: 8.0,
    230802: 7.5,
  },
  'bob': {
    266192: 9.0,
    174430: 8.5,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Filters
// ─────────────────────────────────────────────────────────────────────────────
export const mockDefaultFilters: WizardFilters = {
  playerCount: 4,
  timeRange: { min: 0, max: 300 },
  mode: 'any',
  requireBestWithPlayerCount: false,
  excludeLowRatedThreshold: null,
  ageRange: { min: 0, max: 21 },
  complexityRange: { min: 1, max: 5 },
  ratingRange: { min: 0, max: 10 },
}

export const mockCoopFilters: WizardFilters = {
  ...mockDefaultFilters,
  mode: 'coop',
}

export const mockQuickGameFilters: WizardFilters = {
  ...mockDefaultFilters,
  timeRange: { min: 0, max: 60 },
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Game Owners
// ─────────────────────────────────────────────────────────────────────────────
export const mockGameOwners: Record<number, string[]> = {
  174430: ['alice', 'bob'], // Gloomhaven owned by both
  167791: ['alice'], // Terraforming Mars owned by Alice
  230802: ['alice'], // Azul owned by Alice
  266192: ['bob'], // Wingspan owned by Bob
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Saved Night Filters (compatible with SavedNightData type)
// ─────────────────────────────────────────────────────────────────────────────
export const mockSavedNightFilters = {
  playerCount: 4,
  timeRange: { min: 0, max: 300 },
  mode: 'any' as const,
  requireBestWithPlayerCount: false,
  excludeLowRatedThreshold: undefined,
  ageRange: { min: 0, max: 21 },
  complexityRange: { min: 1, max: 5 },
  ratingRange: { min: 0, max: 10 },
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Saved Nights
// ─────────────────────────────────────────────────────────────────────────────
export const mockSavedNights: SavedNightRecord[] = [
  {
    id: 1,
    createdAt: '2026-01-08T20:00:00Z',
    data: {
      name: 'Friday Night',
      description: 'Weekly session',
      organizerUsername: 'alice',
      usernames: ['alice', 'bob'],
      gameIds: [1, 2],
      filters: mockSavedNightFilters,
      pick: { bggId: 174430, name: 'Gloomhaven', score: 12 },
      alternatives: [
        { bggId: 167791, name: 'Terraforming Mars', score: 8 },
      ],
    },
  },
  {
    id: 2,
    createdAt: '2026-01-01T18:00:00Z',
    data: {
      name: 'New Years Gaming',
      usernames: ['alice', 'charlie'],
      gameIds: [266192, 161936],
      filters: mockSavedNightFilters,
      pick: { bggId: 266192, name: 'Wingspan', score: 10 },
      alternatives: [],
    },
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Mock Recommendation Result
// ─────────────────────────────────────────────────────────────────────────────
export const mockRecommendation = {
  topPick: {
    game: mockGames[0],
    score: 12,
    matchReasons: ['Fits 4 players', 'Coop game'],
  },
  alternatives: [
    {
      game: mockGames[1],
      score: 8,
      matchReasons: ['Fits 4 players'],
    },
  ],
  vetoed: [] as Array<{ game: typeof mockGames[0]; vetoedBy: string[] }>,
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────
export function createMockUser(overrides: Partial<UserRecord> = {}): UserRecord {
  const id = Math.random().toString(36).substring(7)
  return {
    username: `user-${id}`,
    internalId: `user-${id}`,
    displayName: `User ${id}`,
    isBggUser: false,
    isOrganizer: false,
    isDeleted: false,
    ...overrides,
  }
}

export function createMockGame(overrides: Partial<GameRecord> = {}): GameRecord {
  const bggId = Math.floor(Math.random() * 1000000)
  return {
    bggId,
    name: `Game ${bggId}`,
    minPlayers: 2,
    maxPlayers: 4,
    playingTimeMinutes: 60,
    minAge: 10,
    averageRating: 7.5,
    weight: 2.5,
    lastFetchedAt: new Date().toISOString(),
    ...overrides,
  }
}

export function createMockPreference(
  username: string,
  bggId: number,
  overrides: Partial<UserPreferenceRecord> = {},
): UserPreferenceRecord {
  return {
    username,
    bggId,
    rank: undefined,
    isTopPick: false,
    isDisliked: false,
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}
