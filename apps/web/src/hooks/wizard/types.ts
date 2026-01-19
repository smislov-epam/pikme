/**
 * Shared types for wizard state hooks.
 * Each hook exposes its own state slice and actions, composed by useWizardState.
 */
import type { GameRecord, UserRecord, UserPreferenceRecord, SavedNightRecord } from '../../db/types'
import type { WizardFilters } from '../../store/wizardTypes'
import type { BggSearchResult } from '../../services/bgg/types'
import type { LayoutMode } from '../../services/storage/uiPreferences'

// ─────────────────────────────────────────────────────────────────────────────
// Players State
// ─────────────────────────────────────────────────────────────────────────────
export interface PlayersState {
  users: UserRecord[]
  existingLocalUsers: UserRecord[]
  isLoadingUser: boolean
  userError: string | null
  needsApiKey: boolean
  pendingBggUserNotFoundUsername: string | null
}

export interface PlayersActions {
  addBggUser: (username: string) => Promise<void>
  confirmAddBggUserAnyway: () => Promise<void>
  cancelAddBggUserAnyway: () => void
  addLocalUser: (name: string, isOrganizer?: boolean, options?: { forceNew?: boolean }) => Promise<void>
  removeUser: (username: string) => void
  deleteUserPermanently: (username: string) => Promise<void>
  setOrganizer: (username: string) => Promise<void>
  clearUserError: () => void
  clearNeedsApiKey: () => void
}

// Callbacks that PlayersState needs to coordinate with other hooks
export interface PlayersStateCallbacks {
  onUserAdded: (user: UserRecord, games: GameRecord[], ratings: Record<number, number | undefined>, prefs: UserPreferenceRecord[]) => void
  onUserRemoved: (username: string) => void
  onGamesLoaded: (games: GameRecord[], owners: Record<number, string[]>) => void
  onNeedsApiKey: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Games State
// ─────────────────────────────────────────────────────────────────────────────
export interface GamesState {
  games: GameRecord[]
  sessionGameIds: number[]
  excludedBggIds: number[]
  gameOwners: Record<number, string[]>
  sessionGames: GameRecord[] // derived
  gameError: string | null
}

export interface GamesActions {
  searchGame: (query: string) => Promise<BggSearchResult[]>
  addGameToUser: (username: string, bggId: number) => Promise<void>
  removeGameFromUser: (username: string, bggId: number) => Promise<void>
  addGameToSession: (bggId: number) => void
  removeGameFromSession: (bggId: number) => void
  excludeGameFromSession: (bggId: number) => void
  undoExcludeGameFromSession: (bggId: number) => void
  addOwnerToGame: (username: string, bggId: number) => Promise<void>
  fetchGameInfo: (url: string) => Promise<GameInfoResult>
  addGameManually: (usernames: string[], game: ManualGameInput) => Promise<void>
  updateGame: (game: GameRecord) => Promise<void>
  refreshGameFromBgg: (bggId: number, options: { keepNotes: boolean }) => Promise<GameRecord>
  clearGameError: () => void
  // Setters for external coordination
  setGames: React.Dispatch<React.SetStateAction<GameRecord[]>>
  setSessionGameIds: React.Dispatch<React.SetStateAction<number[]>>
  setExcludedBggIds: React.Dispatch<React.SetStateAction<number[]>>
  setGameOwners: React.Dispatch<React.SetStateAction<Record<number, string[]>>>
}

export interface GameInfoResult {
  bggId: number
  name?: string
  thumbnail?: string
  minPlayers?: number
  maxPlayers?: number
  playingTimeMinutes?: number
  minPlayTimeMinutes?: number
  maxPlayTimeMinutes?: number
  minAge?: number
  averageRating?: number
  weight?: number
  categories?: string[]
  mechanics?: string[]
  description?: string
}

export interface ManualGameInput {
  bggId: number
  name: string
  minPlayers?: number
  maxPlayers?: number
  playingTimeMinutes?: number
  minPlayTimeMinutes?: number
  maxPlayTimeMinutes?: number
  minAge?: number
  thumbnail?: string
  image?: string
  averageRating?: number
  weight?: number
  categories?: string[]
  mechanics?: string[]
  description?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Filters State
// ─────────────────────────────────────────────────────────────────────────────
export interface FiltersState {
  filters: WizardFilters
  filteredGames: GameRecord[] // derived from sessionGames + filters
}

export interface FiltersActions {
  setPlayerCount: (count: number) => void
  setTimeRange: (range: { min: number; max: number }) => void
  setMode: (mode: 'coop' | 'competitive' | 'any') => void
  setRequireBestWithPlayerCount: (enabled: boolean) => void
  setExcludeLowRated: (threshold: number | null) => void
  setAgeRange: (range: { min: number; max: number }) => void
  setComplexityRange: (range: { min: number; max: number }) => void
  setRatingRange: (range: { min: number; max: number }) => void
  setFilters: React.Dispatch<React.SetStateAction<WizardFilters>>
}

// ─────────────────────────────────────────────────────────────────────────────
// Preferences State
// ─────────────────────────────────────────────────────────────────────────────
export interface PreferencesState {
  preferences: Record<string, UserPreferenceRecord[]>
  userRatings: Record<string, Record<number, number | undefined>>
}

export interface PreferencesActions {
  updatePreference: (username: string, bggId: number, update: PreferenceUpdate) => void
  clearPreference: (username: string, bggId: number) => void
  reorderPreferences: (username: string, orderedBggIds: number[]) => void
  autoSortByRating: (username: string) => void
  markRestNeutral: (username: string) => void
  setPreferences: React.Dispatch<React.SetStateAction<Record<string, UserPreferenceRecord[]>>>
  setUserRatings: React.Dispatch<React.SetStateAction<Record<string, Record<number, number | undefined>>>>
}

export interface PreferenceUpdate {
  rank?: number
  isTopPick?: boolean
  isDisliked?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Recommendation State
// ─────────────────────────────────────────────────────────────────────────────
export interface ScoredGame {
  game: GameRecord
  score: number
  matchReasons: string[]
}

export interface VetoedGame {
  game: GameRecord
  vetoedBy: string[]
}

export interface RecommendationResult {
  topPick: ScoredGame | null
  alternatives: ScoredGame[]
  vetoed: VetoedGame[]
}

export interface RecommendationState {
  recommendation: RecommendationResult
  promotedPickBggId: number | null
}

export interface RecommendationActions {
  computeRecommendation: () => void
  promoteAlternativeToTopPick: (bggId: number) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Saved Nights State
// ─────────────────────────────────────────────────────────────────────────────
export interface SavedNightsState {
  savedNights: SavedNightRecord[]
}

export interface SavedNightsActions {
  saveNight: (name: string, description?: string, includeGuestUsernames?: string[]) => Promise<void>
  loadSavedNights: () => Promise<void>
  loadSavedNight: (id: number, options?: { includeGames?: boolean }) => Promise<void>
}

// ─────────────────────────────────────────────────────────────────────────────
// UI State
// ─────────────────────────────────────────────────────────────────────────────
export interface UIState {
  layoutMode: LayoutMode
}

export interface UIActions {
  setLayoutMode: (mode: LayoutMode) => void
}
