export type BggUsername = string

export type BggThingId = number

export interface BggCollectionItem {
  bggId: BggThingId
  name: string
  yearPublished?: number
  userRating?: number
}

export interface BggThingDetails {
  bggId: BggThingId
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
}

export interface BggFetchOptions {
  baseUrl?: string
  maxRetries?: number
  initialDelayMs?: number
  maxDelayMs?: number
  signal?: AbortSignal
}

export interface BggSearchResult {
  bggId: BggThingId
  name: string
  yearPublished?: number
  type: 'boardgame' | 'boardgameexpansion'
}

export interface BggSearchOptions extends BggFetchOptions {
  type?: 'boardgame' | 'boardgameexpansion'
  exact?: boolean
}