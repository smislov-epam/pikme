import { db } from '../../db'
import type { GameRecord, UserGameRecord } from '../../db/types'
import type { BggCollectionItem } from '../bgg/types'

export async function syncUserCollection(
  username: string,
  collection: BggCollectionItem[],
): Promise<void> {
  const now = new Date().toISOString()

  await db.transaction('rw', db.userGames, async () => {
    // Remove existing BGG-synced games for this user
    await db.userGames
      .where('username')
      .equals(username)
      .and((record) => record.source === 'bgg')
      .delete()

    // Add new collection
    const records: UserGameRecord[] = collection.map((item) => ({
      username,
      bggId: item.bggId,
      rating: item.userRating,
      source: 'bgg' as const,
      addedAt: now,
    }))

    await db.userGames.bulkAdd(records)
  })
}

export async function addGameToUser(
  username: string,
  bggId: number,
  rating?: number,
): Promise<UserGameRecord> {
  // Check if game already exists for this user
  const existing = await db.userGames
    .where('[username+bggId]')
    .equals([username, bggId])
    .first()

  if (existing) {
    // Update existing record
    await db.userGames.update(existing.id!, {
      rating,
      addedAt: new Date().toISOString(),
    })
    return { ...existing, rating, addedAt: new Date().toISOString() }
  }

  // Create new record
  const record: UserGameRecord = {
    username,
    bggId,
    rating,
    source: 'manual',
    addedAt: new Date().toISOString(),
  }

  const id = await db.userGames.add(record)
  return { ...record, id: id as number }
}

export async function removeGameFromUser(
  username: string,
  bggId: number,
): Promise<void> {
  await db.userGames
    .where('[username+bggId]')
    .equals([username, bggId])
    .delete()
}

export async function getUserGames(
  username: string,
): Promise<UserGameRecord[]> {
  return db.userGames.where('username').equals(username).toArray()
}

export async function getUserGameIds(username: string): Promise<number[]> {
  const games = await db.userGames.where('username').equals(username).toArray()
  return games.map((g) => g.bggId)
}

export async function getGamesForUsers(
  usernames: string[],
): Promise<GameRecord[]> {
  if (usernames.length === 0) return []

  // Get all unique bggIds across all users
  const userGames = await db.userGames
    .where('username')
    .anyOf(usernames)
    .toArray()

  const uniqueBggIds = [...new Set(userGames.map((ug) => ug.bggId))]

  if (uniqueBggIds.length === 0) return []

  // Get game details for all unique games
  return db.games.where('bggId').anyOf(uniqueBggIds).toArray()
}

export async function getUserRating(
  username: string,
  bggId: number,
): Promise<number | undefined> {
  const record = await db.userGames
    .where('[username+bggId]')
    .equals([username, bggId])
    .first()

  return record?.rating
}

export async function updateUserRating(
  username: string,
  bggId: number,
  rating: number,
): Promise<void> {
  const record = await db.userGames
    .where('[username+bggId]')
    .equals([username, bggId])
    .first()

  if (record?.id) {
    await db.userGames.update(record.id, { rating })
  }
}

export async function getUserGamesWithDetails(
  username: string,
): Promise<Array<UserGameRecord & { game?: GameRecord }>> {
  const userGames = await db.userGames
    .where('username')
    .equals(username)
    .toArray()

  const bggIds = userGames.map((ug) => ug.bggId)
  const games = await db.games.where('bggId').anyOf(bggIds).toArray()
  const gameMap = new Map(games.map((g) => [g.bggId, g]))

  return userGames.map((ug) => ({
    ...ug,
    game: gameMap.get(ug.bggId),
  }))
}

/**
 * Get a map of bggId -> list of usernames who own that game
 */
export async function getGameOwners(
  bggIds: number[],
): Promise<Record<number, string[]>> {
  if (bggIds.length === 0) return {}

  const userGames = await db.userGames
    .where('bggId')
    .anyOf(bggIds)
    .toArray()

  const owners: Record<number, string[]> = {}
  for (const ug of userGames) {
    if (!owners[ug.bggId]) {
      owners[ug.bggId] = []
    }
    owners[ug.bggId].push(ug.username)
  }

  return owners
}