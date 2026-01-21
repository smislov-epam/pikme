/**
 * Wizard state management hook - thin wrapper over composed sub-hooks.
 * 
 * This file maintains backward compatibility by exporting the same interface
 * as before while delegating to modular sub-hooks in hooks/wizard/.
 * 
 * @see hooks/wizard/useWizardStateComposed - The actual implementation
 * @see hooks/wizard/usePlayersState - User management
 * @see hooks/wizard/useGamesState - Game collection and session
 * @see hooks/wizard/useFiltersState - Filter configuration  
 * @see hooks/wizard/usePreferencesState - User preferences
 * @see hooks/wizard/useRecommendationState - Recommendation computation
 * @see hooks/wizard/useSavedNightsState - Saved game nights
 */
import type { GameRecord, UserRecord, UserPreferenceRecord, SavedNightRecord } from '../db/types'
import type { BggSearchResult } from '../services/bgg/types'
import type { WizardFilters } from '../store/wizardTypes'
import type { LayoutMode } from '../services/storage/uiPreferences'

// Re-export the composed implementation
export { useWizardStateComposed as useWizardState } from './wizard/useWizardStateComposed'

// ─────────────────────────────────────────────────────────────────────────────
// Type Definitions (maintained for backward compatibility)
// ─────────────────────────────────────────────────────────────────────────────

export interface WizardState {
  // Step 1: Players
  users: UserRecord[]
  games: GameRecord[] // Full collection of all games
  sessionGameIds: number[] // Games included in current session (subset of games)
  excludedBggIds: number[] // Games excluded from current session candidate pool
  gameOwners: Record<number, string[]> // bggId -> usernames who own the game
  existingLocalUsers: UserRecord[] // All local users in DB for autocomplete
  isLoadingUser: boolean
  userError: string | null
  needsApiKey: boolean
  pendingBggUserNotFoundUsername: string | null

  // Step 2: Filters
  filters: WizardFilters
  sessionGames: GameRecord[] // Games in session (before filtering)
  filteredGames: GameRecord[] // Session games after applying filters

  // Step 3: Preferences
  preferences: Record<string, UserPreferenceRecord[]>
  userRatings: Record<string, Record<number, number | undefined>>

  // Step 4: Results
  recommendation: {
    topPick: { game: GameRecord; score: number; matchReasons: string[] } | null
    alternatives: Array<{ game: GameRecord; score: number; matchReasons: string[] }>
    vetoed: Array<{ game: GameRecord; vetoedBy: string[] }>
  }

  /** Optional override: bggId of a manually promoted pick */
  promotedPickBggId: number | null

  // UI preferences
  layoutMode: LayoutMode
}

export interface WizardActions {
  // Players
  addBggUser: (username: string) => Promise<void>
  confirmAddBggUserAnyway: () => Promise<void>
  cancelAddBggUserAnyway: () => void
  addLocalUser: (name: string, isOrganizer?: boolean, options?: { forceNew?: boolean }) => Promise<void>
  removeUser: (username: string) => void
  deleteUserPermanently: (username: string) => Promise<void>
  setOrganizer: (username: string) => Promise<void>
  setExistingLocalUsers: React.Dispatch<React.SetStateAction<UserRecord[]>>
  searchGame: (query: string) => Promise<BggSearchResult[]>
  addGameToUser: (username: string, bggId: number) => Promise<void>
  removeGameFromUser: (username: string, bggId: number) => Promise<void>
  // Session game management
  addGameToSession: (bggId: number) => void
  removeGameFromSession: (bggId: number) => void
  excludeGameFromSession: (bggId: number) => void
  undoExcludeGameFromSession: (bggId: number) => void
  addOwnerToGame: (username: string, bggId: number) => Promise<void>
  fetchGameInfo: (url: string) => Promise<{
    bggId: number; name?: string; thumbnail?: string; minPlayers?: number; maxPlayers?: number
    playingTimeMinutes?: number; minPlayTimeMinutes?: number; maxPlayTimeMinutes?: number
    minAge?: number; averageRating?: number; weight?: number
    categories?: string[]; mechanics?: string[]; description?: string
  }>
  addGameManually: (usernames: string[], game: {
    bggId: number; name: string; minPlayers?: number; maxPlayers?: number
    playingTimeMinutes?: number; minPlayTimeMinutes?: number; maxPlayTimeMinutes?: number
    minAge?: number; thumbnail?: string; image?: string; averageRating?: number
    weight?: number; categories?: string[]; mechanics?: string[]; description?: string
  }) => Promise<void>
  updateGame: (game: GameRecord) => Promise<void>
  refreshGameFromBgg: (bggId: number, options: { keepNotes: boolean }) => Promise<GameRecord>

  // Filters
  setPlayerCount: (count: number) => void
  setTimeRange: (range: { min: number; max: number }) => void
  setMode: (mode: 'coop' | 'competitive' | 'any') => void
  setRequireBestWithPlayerCount: (enabled: boolean) => void
  setExcludeLowRated: (threshold: number | null) => void
  setAgeRange: (range: { min: number; max: number }) => void
  setComplexityRange: (range: { min: number; max: number }) => void
  setRatingRange: (range: { min: number; max: number }) => void

  // Preferences
  updatePreference: (username: string, bggId: number, update: { rank?: number; isTopPick?: boolean; isDisliked?: boolean }) => void
  clearPreference: (username: string, bggId: number) => void
  reorderPreferences: (username: string, orderedBggIds: number[]) => void
  autoSortByRating: (username: string) => void
  markRestNeutral: (username: string) => void

  // Results
  computeRecommendation: () => void
  promoteAlternativeToTopPick: (bggId: number) => void
  saveNight: (name: string, description?: string, includeGuestUsernames?: string[]) => Promise<void>

  // Saved nights
  savedNights: SavedNightRecord[]
  loadSavedNights: () => Promise<void>
  loadSavedNight: (id: number, options?: { includeGames?: boolean }) => Promise<void>

  // Reset
  reset: () => void
  /** Reset session-specific state for creating a new session, keeps user's game collection */
  resetForNewSession: () => void
  /** Load session-specific state from a saved snapshot (REQ-108 session isolation) */
  loadFromSessionState: (state: {
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
  }) => Promise<void>

  // Notifications
  clearUserError: () => void

  // API Key
  clearNeedsApiKey: () => void

  // UI preferences
  setLayoutMode: (mode: LayoutMode) => void
}
