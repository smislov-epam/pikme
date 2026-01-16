export interface GameRecord {
  bggId: number
  name: string
  yearPublished?: number
  thumbnail?: string
  image?: string
  minPlayers?: number
  maxPlayers?: number
  bestWith?: string // e.g. "4" or "3-4" from BGG poll
  playingTimeMinutes?: number
  minPlayTimeMinutes?: number
  maxPlayTimeMinutes?: number
  minAge?: number
  mechanics?: string[]
  categories?: string[]
  description?: string
  averageRating?: number
  weight?: number // BGG complexity 1-5
  userNotes?: string // Legacy free-text notes (migrated to gameNotes)
  lastFetchedAt: string
}

export interface GameNoteRecord {
  id?: number
  bggId: number
  text: string
  createdAt: string
}

export interface UserRecord {
  username: string
  internalId: string // Unique internal identifier (slug-based with random suffix)
  displayName?: string
  isBggUser: boolean
  isOrganizer?: boolean
  // Identity fields (REQ-103 user journeys)
  isLocalOwner?: boolean // "This is ME on this device" - set once, never changes
  firebaseUid?: string // Links to Firebase Auth UID when registered
  linkedAt?: string // When Firebase link was established
  // Preference tracking
  lastPreferencesReviewedAt?: string // When user last reviewed all preferences
  // Sync fields
  lastSyncAt?: string
  ownedCount?: number
  isDeleted?: boolean
}

export interface UserGameRecord {
  id?: number
  username: string
  bggId: number
  rating?: number
  source: 'bgg' | 'manual'
  addedAt: string
}

export interface UserPreferenceRecord {
  id?: number
  username: string
  bggId: number
  rank?: number
  isTopPick: boolean
  isDisliked: boolean
  updatedAt: string
}

export interface WizardStateRecord {
  id: 'singleton'
  data: unknown
  updatedAt: string
}

export interface SavedNightData {
  name: string // User-provided name for the game night
  description?: string // Optional description
  organizerUsername?: string // Starred (host/organizer) player at time of save
  usernames: string[]
  gameIds: number[] // BGG IDs of games in this session
  filters: {
    playerCount?: number
    timeRange?: { min: number; max: number }
    mode?: 'coop' | 'competitive' | 'any'
    excludeLowRatedThreshold?: number
    ageRange?: { min: number; max: number }
    complexityRange?: { min: number; max: number }
    ratingRange?: { min: number; max: number }
  }
  pick: {
    bggId: number
    name: string
    score: number
  }
  alternatives: Array<{
    bggId: number
    name: string
    score: number
  }>
}

export interface SavedNightRecord {
  id?: number
  createdAt: string
  data: SavedNightData
}

export interface GameFilters {
  playerCount?: number
  minPlayTime?: number
  maxPlayTime?: number
  mode?: 'coop' | 'competitive' | 'any'
  ageRange?: { min: number; max: number }
  complexityRange?: { min: number; max: number }
  ratingRange?: { min: number; max: number }
  bggIds?: number[]
}
