export interface PartialGameInfo {
  bggId: number
  name?: string
  thumbnail?: string
  yearPublished?: number
  minPlayers?: number
  maxPlayers?: number
  bestWith?: string
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
