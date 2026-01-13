import { db } from '../../db'
import type { GameFilters, GameRecord } from '../../db/types'
import type { BggThingDetails } from '../bgg/types'

const COOP_MECHANICS = [
  'Cooperative Game',
  'Solo / Solitaire Game',
  'Team-Based Game',
]

export async function upsertGame(game: BggThingDetails): Promise<GameRecord> {
  const record: GameRecord = {
    bggId: game.bggId,
    name: game.name,
    yearPublished: game.yearPublished,
    thumbnail: game.thumbnail,
    minPlayers: game.minPlayers,
    maxPlayers: game.maxPlayers,
    bestWith: game.bestWith,
    playingTimeMinutes: game.playingTimeMinutes,
    minPlayTimeMinutes: game.minPlayTimeMinutes,
    maxPlayTimeMinutes: game.maxPlayTimeMinutes,
    minAge: game.minAge,
    mechanics: game.mechanics,
    categories: game.categories,
    description: game.description,
    averageRating: game.averageRating,
    weight: game.weight,
    lastFetchedAt: new Date().toISOString(),
  }

  await db.games.put(record)
  return record
}

export async function upsertGames(
  games: BggThingDetails[],
): Promise<GameRecord[]> {
  const now = new Date().toISOString()
  const records: GameRecord[] = games.map((game) => ({
    bggId: game.bggId,
    name: game.name,
    yearPublished: game.yearPublished,
    thumbnail: game.thumbnail,
    minPlayers: game.minPlayers,
    maxPlayers: game.maxPlayers,
    bestWith: game.bestWith,
    playingTimeMinutes: game.playingTimeMinutes,
    minPlayTimeMinutes: game.minPlayTimeMinutes,
    maxPlayTimeMinutes: game.maxPlayTimeMinutes,
    minAge: game.minAge,
    mechanics: game.mechanics,
    categories: game.categories,
    description: game.description,
    averageRating: game.averageRating,
    weight: game.weight,
    lastFetchedAt: now,
  }))

  await db.games.bulkPut(records)
  return records
}

export async function getGame(
  bggId: number,
): Promise<GameRecord | undefined> {
  return db.games.get(bggId)
}

export async function getGames(bggIds: number[]): Promise<GameRecord[]> {
  if (bggIds.length === 0) return []
  const games = await db.games.where('bggId').anyOf(bggIds).toArray()
  return games
}

export async function getAllGames(): Promise<GameRecord[]> {
  return db.games.toArray()
}

/**
 * Update an existing game record (preserves existing fields not in update)
 */
export async function updateGame(game: GameRecord): Promise<GameRecord> {
  await db.games.put(game)
  return game
}

function isCoopGame(mechanics?: string[]): boolean {
  if (!mechanics) return false
  return mechanics.some((m) => COOP_MECHANICS.includes(m))
}

export async function queryGamesByFilters(
  filters: GameFilters,
): Promise<GameRecord[]> {
  let query = db.games.toCollection()

  // If we have specific bggIds, filter by those first
  if (filters.bggIds && filters.bggIds.length > 0) {
    query = db.games.where('bggId').anyOf(filters.bggIds)
  }

  const games = await query.toArray()

  return games.filter((game) => {
    // Player count filter
    if (filters.playerCount !== undefined) {
      const min = game.minPlayers ?? 1
      const max = game.maxPlayers ?? 99
      if (filters.playerCount < min || filters.playerCount > max) {
        return false
      }
    }

    // Play time filter
    const playTime = game.playingTimeMinutes
    if (playTime !== undefined) {
      if (
        filters.minPlayTime !== undefined &&
        playTime < filters.minPlayTime
      ) {
        return false
      }
      if (
        filters.maxPlayTime !== undefined &&
        playTime > filters.maxPlayTime
      ) {
        return false
      }
    }

    // Coop/competitive filter
    if (filters.mode && filters.mode !== 'any') {
      const isCoop = isCoopGame(game.mechanics)
      if (filters.mode === 'coop' && !isCoop) return false
      if (filters.mode === 'competitive' && isCoop) return false
    }

    // Min age range (allow unknown)
    if (filters.ageRange && game.minAge !== undefined) {
      if (game.minAge < filters.ageRange.min || game.minAge > filters.ageRange.max) {
        return false
      }
    }

    // Complexity/weight range (allow unknown)
    if (filters.complexityRange && game.weight !== undefined) {
      if (
        game.weight < filters.complexityRange.min ||
        game.weight > filters.complexityRange.max
      ) {
        return false
      }
    }

    // Average rating range (allow unknown)
    if (filters.ratingRange && game.averageRating !== undefined) {
      if (
        game.averageRating < filters.ratingRange.min ||
        game.averageRating > filters.ratingRange.max
      ) {
        return false
      }
    }

    return true
  })
}

export async function getStaleGames(
  bggIds: number[],
  maxAgeMs: number,
): Promise<number[]> {
  if (bggIds.length === 0) return []

  const cutoff = new Date(Date.now() - maxAgeMs).toISOString()
  const games = await db.games.where('bggId').anyOf(bggIds).toArray()

  const freshIds = new Set(
    games.filter((g) => g.lastFetchedAt > cutoff).map((g) => g.bggId),
  )

  return bggIds.filter((id) => !freshIds.has(id))
}
