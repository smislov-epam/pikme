/**
 * Hook for managing game collection and session state in the wizard.
 * 
 * Single responsibility: Game data, session subset, exclusions, and ownership.
 * 
 * ## Usage
 * 
 * ```ts
 * const { games, sessionGames, addGameToSession, ... } = useGamesState({
 *   onNeedsApiKey,
 * })
 * ```
 */
import { useState, useCallback, useMemo } from 'react'
import type { GameRecord } from '../../db/types'
import type { GamesState, GamesActions, GameInfoResult, ManualGameInput } from './types'
import * as dbService from '../../services/db'
import * as bggService from '../../services/bgg/bggService'
import { BggAuthError, BggRateLimitError } from '../../services/bgg/errors'

export interface UseGamesStateOptions {
  /** Callback when API key is needed */
  onNeedsApiKey?: () => void
  /** Initial games (for session restore) */
  initialGames?: GameRecord[]
  /** Initial session game IDs (for session restore) */
  initialSessionGameIds?: number[]
  /** Initial excluded IDs (for session restore) */
  initialExcludedBggIds?: number[]
  /** Initial game owners (for session restore) */
  initialGameOwners?: Record<number, string[]>
}

export interface UseGamesStateResult extends GamesState, GamesActions {}

export function useGamesState(options: UseGamesStateOptions = {}): UseGamesStateResult {
  const {
    onNeedsApiKey,
    initialGames,
    initialSessionGameIds,
    initialExcludedBggIds,
    initialGameOwners,
  } = options

  const [games, setGames] = useState<GameRecord[]>(initialGames ?? [])
  const [sessionGameIds, setSessionGameIds] = useState<number[]>(initialSessionGameIds ?? [])
  const [excludedBggIds, setExcludedBggIds] = useState<number[]>(initialExcludedBggIds ?? [])
  const [gameOwners, setGameOwners] = useState<Record<number, string[]>>(initialGameOwners ?? {})
  const [gameError, setGameError] = useState<string | null>(null)

  // Derived: session games (before filtering)
  const sessionGames = useMemo(() => {
    const sessionSet = new Set(sessionGameIds)
    const excludedSet = new Set(excludedBggIds)
    return games.filter((g) => sessionSet.has(g.bggId) && !excludedSet.has(g.bggId))
  }, [games, excludedBggIds, sessionGameIds])

  const clearGameError = useCallback(() => {
    setGameError(null)
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // Game Search
  // ─────────────────────────────────────────────────────────────────────────
  const searchGame = useCallback(
    async (query: string) => {
      try {
        return await bggService.searchGames(query)
      } catch (err) {
        if (err instanceof BggAuthError || err instanceof BggRateLimitError) {
          onNeedsApiKey?.()
        }
        setGameError(err instanceof Error ? err.message : 'Failed to search games')
        return []
      }
    },
    [onNeedsApiKey],
  )

  // ─────────────────────────────────────────────────────────────────────────
  // Game-User Association
  // ─────────────────────────────────────────────────────────────────────────
  const addGameToUser = useCallback(
    async (username: string, bggId: number) => {
      try {
        const game = await bggService.addGameToUserCollection(username, bggId)
        setGames((prev) => {
          if (prev.some((g) => g.bggId === bggId)) return prev
          return [...prev, game]
        })
        setSessionGameIds((prev) => (prev.includes(bggId) ? prev : [...prev, bggId]))
        setGameOwners((prev) => ({
          ...prev,
          [bggId]: [...(prev[bggId] ?? []).filter((u) => u !== username), username],
        }))
      } catch (err) {
        if (err instanceof BggAuthError || err instanceof BggRateLimitError) {
          onNeedsApiKey?.()
        }
        setGameError(err instanceof Error ? err.message : 'Failed to add game')
      }
    },
    [onNeedsApiKey],
  )

  const removeGameFromUser = useCallback(async (username: string, bggId: number) => {
    try {
      await dbService.removeGameFromUser(username, bggId)
      setGameOwners((prev) => {
        const owners = (prev[bggId] ?? []).filter((u) => u !== username)
        if (owners.length === 0) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [bggId]: _removed, ...rest } = prev
          return rest
        }
        return { ...prev, [bggId]: owners }
      })
    } catch (err) {
      setGameError(err instanceof Error ? err.message : 'Failed to remove game')
    }
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // Session Management
  // ─────────────────────────────────────────────────────────────────────────
  const addGameToSession = useCallback((bggId: number) => {
    setSessionGameIds((prev) => (prev.includes(bggId) ? prev : [...prev, bggId]))
    setExcludedBggIds((prev) => prev.filter((id) => id !== bggId))
  }, [])

  const removeGameFromSession = useCallback((bggId: number) => {
    setSessionGameIds((prev) => prev.filter((id) => id !== bggId))
  }, [])

  const excludeGameFromSession = useCallback((bggId: number) => {
    setExcludedBggIds((prev) => (prev.includes(bggId) ? prev : [...prev, bggId]))
  }, [])

  const undoExcludeGameFromSession = useCallback((bggId: number) => {
    setExcludedBggIds((prev) => prev.filter((id) => id !== bggId))
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // Ownership Management
  // ─────────────────────────────────────────────────────────────────────────
  const addOwnerToGame = useCallback(
    async (username: string, bggId: number) => {
      try {
        const game = games.find((g) => g.bggId === bggId)
        if (!game) {
          setGameError('Game not found in collection')
          return
        }
        await dbService.addGameToUser(username, bggId)
        setGameOwners((prev) => {
          const owners = prev[bggId] ?? []
          if (owners.includes(username)) return prev
          return { ...prev, [bggId]: [...owners, username] }
        })
      } catch (err) {
        setGameError(err instanceof Error ? err.message : 'Failed to add owner')
      }
    },
    [games],
  )

  // ─────────────────────────────────────────────────────────────────────────
  // Manual Game Addition
  // ─────────────────────────────────────────────────────────────────────────
  const fetchGameInfo = useCallback(async (url: string): Promise<GameInfoResult> => {
    const info = await bggService.fetchGameInfoFromUrl(url)
    return {
      bggId: info.bggId,
      name: info.name,
      thumbnail: info.thumbnail,
      minPlayers: info.minPlayers,
      maxPlayers: info.maxPlayers,
      playingTimeMinutes: info.playingTimeMinutes,
      minPlayTimeMinutes: info.minPlayTimeMinutes,
      maxPlayTimeMinutes: info.maxPlayTimeMinutes,
      minAge: info.minAge,
      averageRating: info.averageRating,
      weight: info.weight,
      categories: info.categories,
      mechanics: info.mechanics,
      description: info.description,
    }
  }, [])

  const addGameManually = useCallback(
    async (usernames: string[], game: ManualGameInput) => {
      setGameError(null)
      try {
        for (const username of usernames) {
          const addedGame = await bggService.addGameManually(username, game)
          setGames((prev) => {
            if (prev.some((g) => g.bggId === addedGame.bggId)) return prev
            return [...prev, addedGame]
          })
          setSessionGameIds((prev) =>
            prev.includes(addedGame.bggId) ? prev : [...prev, addedGame.bggId],
          )
          setGameOwners((prev) => ({
            ...prev,
            [addedGame.bggId]: [...new Set([...(prev[addedGame.bggId] ?? []), username])],
          }))
        }
      } catch (err) {
        setGameError(err instanceof Error ? err.message : 'Failed to add game manually')
      }
    },
    [],
  )

  // ─────────────────────────────────────────────────────────────────────────
  // Game Updates
  // ─────────────────────────────────────────────────────────────────────────
  const updateGame = useCallback(async (game: GameRecord) => {
    await dbService.updateGame(game)
    setGames((prev) => prev.map((g) => (g.bggId === game.bggId ? game : g)))
  }, [])

  const refreshGameFromBgg = useCallback(
    async (bggId: number, options: { keepNotes: boolean }) => {
      const existing = games.find((g) => g.bggId === bggId)
      if (!existing) {
        throw new Error('Game not found')
      }

      let canonical: Partial<GameRecord> | null = null

      try {
        const details = await bggService.fetchThingDetails([bggId])
        const first = details[0]
        if (first) {
          canonical = {
            name: first.name,
            yearPublished: first.yearPublished,
            thumbnail: first.thumbnail,
            minPlayers: first.minPlayers,
            maxPlayers: first.maxPlayers,
            bestWith: first.bestWith,
            playingTimeMinutes: first.playingTimeMinutes,
            minPlayTimeMinutes: first.minPlayTimeMinutes,
            maxPlayTimeMinutes: first.maxPlayTimeMinutes,
            minAge: first.minAge,
            averageRating: first.averageRating,
            weight: first.weight,
            categories: first.categories,
            mechanics: first.mechanics,
            description: first.description,
          }
        }
      } catch {
        // Fallback to HTML scraping
        const { fetchPartialGameInfo, toGameDetails } = await import(
          '../../services/bgg/bggScraper'
        )
        const partial = await fetchPartialGameInfo(
          `https://boardgamegeek.com/boardgame/${bggId}`,
        )
        const details = toGameDetails(partial)
        canonical = {
          name: details.name,
          yearPublished: details.yearPublished,
          thumbnail: details.thumbnail,
          minPlayers: details.minPlayers,
          maxPlayers: details.maxPlayers,
          bestWith: details.bestWith,
          playingTimeMinutes: details.playingTimeMinutes,
          minPlayTimeMinutes: details.minPlayTimeMinutes,
          maxPlayTimeMinutes: details.maxPlayTimeMinutes,
          minAge: details.minAge,
          averageRating: details.averageRating,
          weight: details.weight,
          categories: details.categories,
          mechanics: details.mechanics,
          description: details.description,
        }
      }

      if (!canonical) {
        throw new Error('Failed to refresh game from BGG')
      }

      const updated: GameRecord = {
        ...existing,
        ...canonical,
        userNotes: undefined,
        lastFetchedAt: new Date().toISOString(),
      }

      if (!options.keepNotes) {
        await dbService.clearGameNotes(bggId)
      }

      await dbService.updateGame(updated)
      setGames((prev) => prev.map((g) => (g.bggId === bggId ? updated : g)))
      return updated
    },
    [games],
  )

  return {
    // State
    games,
    sessionGameIds,
    excludedBggIds,
    gameOwners,
    sessionGames,
    gameError,

    // Actions
    searchGame,
    addGameToUser,
    removeGameFromUser,
    addGameToSession,
    removeGameFromSession,
    excludeGameFromSession,
    undoExcludeGameFromSession,
    addOwnerToGame,
    fetchGameInfo,
    addGameManually,
    updateGame,
    refreshGameFromBgg,
    clearGameError,
    setGames,
    setSessionGameIds,
    setExcludedBggIds,
    setGameOwners,
  }
}
