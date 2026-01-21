/**
 * BGG matching service for recognized games.
 * Searches BoardGameGeek for games matching recognized titles.
 */

import { searchGames } from '../bgg/bggService'

export interface BggMatchResult {
  bggId: number
  name: string
  yearPublished?: number
  thumbnail?: string
}

/**
 * Search BGG for a game by name and return the best match.
 * Returns null if no suitable match found.
 *
 * @param gameName - The recognized game name from photo
 * @param signal - Optional AbortSignal for cancellation
 */
export async function findBggMatch(
  gameName: string,
  signal?: AbortSignal
): Promise<BggMatchResult | null> {
  try {
    const results = await searchGames(gameName, { signal })

    if (results.length === 0) {
      return null
    }

    // First, try exact match (case-insensitive)
    const exactMatch = results.find(
      (r) => r.name.toLowerCase() === gameName.toLowerCase()
    )

    if (exactMatch) {
      return {
        bggId: exactMatch.bggId,
        name: exactMatch.name,
        yearPublished: exactMatch.yearPublished,
      }
    }

    // Otherwise, take the first result (BGG orders by relevance)
    const bestMatch = results[0]
    return {
      bggId: bestMatch.bggId,
      name: bestMatch.name,
      yearPublished: bestMatch.yearPublished,
    }
  } catch (error) {
    // Log but don't throw - matching failure shouldn't break the flow
    console.warn(`BGG match failed for "${gameName}":`, error)
    return null
  }
}

/**
 * Batch search BGG for multiple games.
 * Returns a map of recognized names to their BGG matches.
 *
 * @param gameNames - Array of recognized game names
 * @param signal - Optional AbortSignal for cancellation
 */
export async function findBggMatchesBatch(
  gameNames: string[],
  signal?: AbortSignal
): Promise<Map<string, BggMatchResult | null>> {
  const results = new Map<string, BggMatchResult | null>()

  // Process in parallel with limited concurrency
  const CONCURRENCY = 3
  for (let i = 0; i < gameNames.length; i += CONCURRENCY) {
    if (signal?.aborted) {
      break
    }

    const batch = gameNames.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(
      batch.map((name) => findBggMatch(name, signal))
    )

    batch.forEach((name, index) => {
      results.set(name, batchResults[index])
    })
  }

  return results
}
