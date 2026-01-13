import type { GameRecord, UserRecord } from '../../db/types'
import {
  addGameToUser,
  createBggUser,
  getStaleGames,
  syncUserCollection,
  updateUserLastSync,
  updateUserOwnedCount,
  upsertGame,
  upsertGames,
} from '../db'
import { BggAuthError, fetchQueuedXml, hasBggApiKey } from './bggClient'
import { buildCollectionUrl, buildSearchUrl, buildThingUrl } from './bggUrls'
import { parseCollectionXml } from './parseCollectionXml'
import { parseSearchXml } from './parseSearchXml'
import { parseThingXml } from './parseThingXml'
import type {
  BggCollectionItem,
  BggFetchOptions,
  BggSearchOptions,
  BggSearchResult,
  BggThingDetails,
  BggThingId,
} from './types'

const DEFAULT_MAX_RETRIES = 12
const DEFAULT_INITIAL_DELAY_MS = 1000
const DEFAULT_MAX_DELAY_MS = 15000

// Default cache duration: 24 hours
const DEFAULT_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000

// Max batch size for BGG Thing API
const THING_BATCH_SIZE = 20

function requireApiKeyForXml(feature: string): void {
  if (hasBggApiKey()) return
  throw new BggAuthError(
    `BGG ${feature} requires an API key in this app. ` +
      'Add a BGG API key in Settings, or add games via BGG links (HTML scrape mode).',
  )
}

export async function fetchOwnedCollection(
  username: string,
  options: BggFetchOptions = {},
): Promise<BggCollectionItem[]> {
  requireApiKeyForXml('collection import')
  const url = buildCollectionUrl({ username, baseUrl: options.baseUrl })
  const xml = await fetchQueuedXml(url, {
    maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
    initialDelayMs: options.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS,
    maxDelayMs: options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS,
    signal: options.signal,
  })

  return parseCollectionXml(xml)
}

export async function fetchThingDetails(
  ids: BggThingId[],
  options: BggFetchOptions = {},
): Promise<BggThingDetails[]> {
  if (ids.length === 0) return []

  requireApiKeyForXml('game details')

  const url = buildThingUrl({ ids, baseUrl: options.baseUrl })
  const xml = await fetchQueuedXml(url, {
    // Thing endpoint rarely returns 202, but using the same handler keeps it resilient.
    maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
    initialDelayMs: options.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS,
    maxDelayMs: options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS,
    signal: options.signal,
  })

  return parseThingXml(xml)
}

export async function searchGames(
  query: string,
  options: BggSearchOptions = {},
): Promise<BggSearchResult[]> {
  requireApiKeyForXml('search')
  const url = buildSearchUrl({
    query,
    type: options.type,
    exact: options.exact,
    baseUrl: options.baseUrl,
  })

  const xml = await fetchQueuedXml(url, {
    maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
    initialDelayMs: options.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS,
    maxDelayMs: options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS,
    signal: options.signal,
  })

  return parseSearchXml(xml)
}

/**
 * Sync game details to the database.
 * Checks cache first and only fetches games that are stale or missing.
 */
export async function syncGameDetailsToDb(
  bggIds: number[],
  options: BggFetchOptions & { cacheMaxAgeMs?: number } = {},
): Promise<GameRecord[]> {
  if (bggIds.length === 0) return []

  const cacheMaxAgeMs = options.cacheMaxAgeMs ?? DEFAULT_CACHE_MAX_AGE_MS

  // Find which games need to be fetched (stale or missing)
  const staleIds = await getStaleGames(bggIds, cacheMaxAgeMs)

  if (staleIds.length === 0) {
    // All games are fresh in cache, return them
    const { getGames } = await import('../db')
    return getGames(bggIds)
  }

  // Fetch stale games in batches
  const allDetails: BggThingDetails[] = []
  for (let i = 0; i < staleIds.length; i += THING_BATCH_SIZE) {
    const batch = staleIds.slice(i, i + THING_BATCH_SIZE)
    const details = await fetchThingDetails(batch, options)
    allDetails.push(...details)
  }

  // Store fetched games in DB
  if (allDetails.length > 0) {
    await upsertGames(allDetails)
  }

  // Return all requested games from DB
  const { getGames } = await import('../db')
  return getGames(bggIds)
}

/**
 * Sync a user's BGG collection to the database.
 * Creates/updates the user, syncs their collection, and fetches game details.
 */
export async function syncUserCollectionToDb(
  username: string,
  options: BggFetchOptions & { cacheMaxAgeMs?: number } = {},
): Promise<{ games: GameRecord[]; user: UserRecord }> {
  // Fetch collection from BGG
  const collection = await fetchOwnedCollection(username, options)

  // Create/update user record
  const user = await createBggUser(username)
  await updateUserOwnedCount(username, collection.length)
  await updateUserLastSync(username)

  // Sync user's collection to DB
  await syncUserCollection(username, collection)

  // Get all unique game IDs
  const bggIds = collection.map((item) => item.bggId)

  // Sync game details to DB
  const games = await syncGameDetailsToDb(bggIds, options)

  return {
    games,
    user: {
      ...user,
      ownedCount: collection.length,
      lastSyncAt: new Date().toISOString(),
    },
  }
}

/**
 * Sync multiple users' BGG collections to the database.
 * Returns the union of all games across users.
 */
export async function syncMultipleUsersToDb(
  usernames: string[],
  options: BggFetchOptions & { cacheMaxAgeMs?: number } = {},
): Promise<{ games: GameRecord[]; users: UserRecord[] }> {
  const users: UserRecord[] = []
  const allBggIds = new Set<number>()

  // Sync each user's collection
  for (const username of usernames) {
    const { user } = await syncUserCollectionToDb(username, options)
    users.push(user)

    // Collect all game IDs
    const { getUserGameIds } = await import('../db')
    const gameIds = await getUserGameIds(username)
    gameIds.forEach((id) => allBggIds.add(id))
  }

  // Fetch all unique games
  const { getGames } = await import('../db')
  const games = await getGames([...allBggIds])

  return { games, users }
}

/**
 * Add a game to a user's collection by fetching from BGG.
 * Used for manual game addition by local users.
 */
export async function addGameToUserCollection(
  username: string,
  bggId: number,
  options: BggFetchOptions = {},
): Promise<GameRecord> {
  let gameDetails: Awaited<ReturnType<typeof fetchThingDetails>>[number] | undefined

  if (hasBggApiKey()) {
    // Fetch game details from BGG XML API
    const details = await fetchThingDetails([bggId], options)
    gameDetails = details[0]
  } else {
    // No API key: use HTML scraping strategy for manual additions.
    const { fetchPartialGameInfo, toGameDetails } = await import('./bggScraper')
    const partial = await fetchPartialGameInfo(`https://boardgamegeek.com/boardgame/${bggId}`)
    gameDetails = toGameDetails(partial)
  }

  if (!gameDetails) {
    throw new Error(`Game with BGG ID ${bggId} not found`)
  }

  // Store game in DB
  const game = await upsertGame(gameDetails)

  // Add to user's collection
  await addGameToUser(username, bggId)

  return game
}

/**
 * Fetch partial game info from a BGG URL (meta tags only).
 * Returns what can be extracted - user completes the rest.
 */
export async function fetchGameInfoFromUrl(url: string) {
  const { fetchPartialGameInfo } = await import('./bggScraper')
  return fetchPartialGameInfo(url)
}

/**
 * Add a game from a BGG URL with manual data merge.
 */
export async function addGameFromBggUrl(
  username: string,
  url: string,
  manualData?: { name?: string; minPlayers?: number; maxPlayers?: number; playingTimeMinutes?: number },
): Promise<GameRecord> {
  const { fetchPartialGameInfo, toGameDetails, extractBggIdFromUrl } = await import('./bggScraper')

  const bggId = extractBggIdFromUrl(url)
  if (!bggId) {
    throw new Error('Invalid BGG URL format')
  }

  // Get what we can from meta tags
  const partial = await fetchPartialGameInfo(url)
  
  // Merge with any manual data
  const details = toGameDetails(partial, manualData)

  // Store game in DB
  const game = await upsertGame(details)

  // Add to user's collection
  await addGameToUser(username, bggId)

  return game
}

/**
 * Add a game with manual details (no API call needed).
 * Allows users to enter game info directly.
 */
export async function addGameManually(
  username: string,
  game: {
    bggId: number
    name: string
    minPlayers?: number
    maxPlayers?: number
    bestWith?: string
    playingTimeMinutes?: number
    minPlayTimeMinutes?: number
    maxPlayTimeMinutes?: number
    minAge?: number
    thumbnail?: string
    averageRating?: number
    weight?: number
    categories?: string[]
    mechanics?: string[]
    description?: string
  },
): Promise<GameRecord> {
  // Calculate playingTimeMinutes from min/max if not provided
  let playingTimeMinutes = game.playingTimeMinutes
  if (!playingTimeMinutes && (game.minPlayTimeMinutes || game.maxPlayTimeMinutes)) {
    const min = game.minPlayTimeMinutes ?? game.maxPlayTimeMinutes ?? 0
    const max = game.maxPlayTimeMinutes ?? game.minPlayTimeMinutes ?? 0
    playingTimeMinutes = Math.round((min + max) / 2)
  }

  // Store game in DB
  const gameRecord = await upsertGame({
    bggId: game.bggId,
    name: game.name,
    minPlayers: game.minPlayers,
    maxPlayers: game.maxPlayers,
    bestWith: game.bestWith,
    playingTimeMinutes,
    minPlayTimeMinutes: game.minPlayTimeMinutes,
    maxPlayTimeMinutes: game.maxPlayTimeMinutes,
    minAge: game.minAge,
    thumbnail: game.thumbnail,
    averageRating: game.averageRating,
    weight: game.weight,
    categories: game.categories,
    mechanics: game.mechanics,
    description: game.description,
  })

  // Add to user's collection
  await addGameToUser(username, game.bggId)

  return gameRecord
}