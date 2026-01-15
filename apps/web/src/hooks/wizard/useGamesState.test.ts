/**
 * Tests for useGamesState hook.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGamesState } from './useGamesState'
import { mockGames, mockGameOwners } from './__tests__/fixtures'

// Mock services
vi.mock('../../services/db', () => ({
  removeGameFromUser: vi.fn().mockResolvedValue(undefined),
  addGameToUser: vi.fn().mockResolvedValue(undefined),
  updateGame: vi.fn().mockResolvedValue(undefined),
  clearGameNotes: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../services/bgg/bggService', () => ({
  searchGames: vi.fn().mockResolvedValue([
    { bggId: 1, name: 'Test Game', yearPublished: 2020 },
  ]),
  addGameToUserCollection: vi.fn().mockImplementation(async (_username: string, bggId: number) => ({
    bggId,
    name: `Game ${bggId}`,
    lastFetchedAt: new Date().toISOString(),
  })),
  addGameManually: vi.fn().mockImplementation(async (_username: string, game: { bggId: number; name: string }) => ({
    ...game,
    lastFetchedAt: new Date().toISOString(),
  })),
  fetchGameInfoFromUrl: vi.fn().mockResolvedValue({
    bggId: 12345,
    name: 'Fetched Game',
  }),
  fetchThingDetails: vi.fn().mockResolvedValue([]),
}))

describe('useGamesState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('starts with empty state when no initial values', () => {
      const { result } = renderHook(() => useGamesState())

      expect(result.current.games).toEqual([])
      expect(result.current.sessionGameIds).toEqual([])
      expect(result.current.excludedBggIds).toEqual([])
      expect(result.current.gameOwners).toEqual({})
    })

    it('uses provided initial state', () => {
      const { result } = renderHook(() =>
        useGamesState({
          initialGames: mockGames,
          initialSessionGameIds: [174430, 167791],
          initialExcludedBggIds: [230802],
          initialGameOwners: mockGameOwners,
        }),
      )

      expect(result.current.games).toEqual(mockGames)
      expect(result.current.sessionGameIds).toEqual([174430, 167791])
      expect(result.current.excludedBggIds).toEqual([230802])
      expect(result.current.gameOwners).toEqual(mockGameOwners)
    })
  })

  describe('sessionGames derivation', () => {
    it('returns games in session but not excluded', () => {
      const { result } = renderHook(() =>
        useGamesState({
          initialGames: mockGames,
          initialSessionGameIds: [174430, 167791, 230802],
          initialExcludedBggIds: [230802],
        }),
      )

      // Should include 174430 and 167791, but not 230802 (excluded)
      expect(result.current.sessionGames).toHaveLength(2)
      expect(result.current.sessionGames.map((g) => g.bggId)).toEqual([174430, 167791])
    })

    it('returns empty when no session games', () => {
      const { result } = renderHook(() =>
        useGamesState({
          initialGames: mockGames,
          initialSessionGameIds: [],
        }),
      )

      expect(result.current.sessionGames).toEqual([])
    })
  })

  describe('session management', () => {
    it('addGameToSession adds game ID to session', () => {
      const { result } = renderHook(() =>
        useGamesState({
          initialGames: mockGames,
          initialSessionGameIds: [174430],
        }),
      )

      act(() => {
        result.current.addGameToSession(167791)
      })

      expect(result.current.sessionGameIds).toContain(167791)
    })

    it('addGameToSession removes game from excluded list', () => {
      const { result } = renderHook(() =>
        useGamesState({
          initialGames: mockGames,
          initialSessionGameIds: [174430],
          initialExcludedBggIds: [167791],
        }),
      )

      act(() => {
        result.current.addGameToSession(167791)
      })

      expect(result.current.excludedBggIds).not.toContain(167791)
    })

    it('removeGameFromSession removes game ID', () => {
      const { result } = renderHook(() =>
        useGamesState({
          initialSessionGameIds: [174430, 167791],
        }),
      )

      act(() => {
        result.current.removeGameFromSession(174430)
      })

      expect(result.current.sessionGameIds).not.toContain(174430)
      expect(result.current.sessionGameIds).toContain(167791)
    })

    it('excludeGameFromSession adds to excluded list', () => {
      const { result } = renderHook(() =>
        useGamesState({
          initialSessionGameIds: [174430],
        }),
      )

      act(() => {
        result.current.excludeGameFromSession(174430)
      })

      expect(result.current.excludedBggIds).toContain(174430)
    })

    it('undoExcludeGameFromSession removes from excluded list', () => {
      const { result } = renderHook(() =>
        useGamesState({
          initialExcludedBggIds: [174430],
        }),
      )

      act(() => {
        result.current.undoExcludeGameFromSession(174430)
      })

      expect(result.current.excludedBggIds).not.toContain(174430)
    })
  })

  describe('searchGame', () => {
    it('returns search results', async () => {
      const { result } = renderHook(() => useGamesState())

      let results: unknown[] = []
      await act(async () => {
        results = await result.current.searchGame('test')
      })

      expect(results).toHaveLength(1)
      expect(results[0]).toMatchObject({ bggId: 1, name: 'Test Game' })
    })

    it('calls onNeedsApiKey on auth error', async () => {
      const { searchGames } = await import('../../services/bgg/bggService')
      const { BggAuthError } = await import('../../services/bgg/errors')
      vi.mocked(searchGames).mockRejectedValueOnce(new BggAuthError('Need key'))

      const onNeedsApiKey = vi.fn()
      const { result } = renderHook(() => useGamesState({ onNeedsApiKey }))

      await act(async () => {
        await result.current.searchGame('test')
      })

      expect(onNeedsApiKey).toHaveBeenCalled()
      expect(result.current.gameError).toBe('Need key')
    })
  })

  describe('addGameToUser', () => {
    it('adds game to collection and session', async () => {
      const { result } = renderHook(() => useGamesState())

      await act(async () => {
        await result.current.addGameToUser('alice', 999)
      })

      expect(result.current.games.some((g) => g.bggId === 999)).toBe(true)
      expect(result.current.sessionGameIds).toContain(999)
      expect(result.current.gameOwners[999]).toContain('alice')
    })
  })

  describe('removeGameFromUser', () => {
    it('removes user from game owners', async () => {
      const { result } = renderHook(() =>
        useGamesState({
          initialGames: mockGames,
          initialGameOwners: { 174430: ['alice', 'bob'] },
        }),
      )

      await act(async () => {
        await result.current.removeGameFromUser('alice', 174430)
      })

      expect(result.current.gameOwners[174430]).toEqual(['bob'])
    })

    it('removes game owners entry when last owner removed', async () => {
      const { result } = renderHook(() =>
        useGamesState({
          initialGames: mockGames,
          initialGameOwners: { 174430: ['alice'] },
        }),
      )

      await act(async () => {
        await result.current.removeGameFromUser('alice', 174430)
      })

      expect(result.current.gameOwners[174430]).toBeUndefined()
    })
  })

  describe('addGameManually', () => {
    it('adds game for multiple users', async () => {
      const { result } = renderHook(() => useGamesState())

      await act(async () => {
        await result.current.addGameManually(['alice', 'bob'], {
          bggId: 12345,
          name: 'Manual Game',
        })
      })

      expect(result.current.games.some((g) => g.bggId === 12345)).toBe(true)
      expect(result.current.sessionGameIds).toContain(12345)
      expect(result.current.gameOwners[12345]).toEqual(['alice', 'bob'])
    })
  })

  describe('direct setters', () => {
    it('setGames replaces games array', () => {
      const { result } = renderHook(() => useGamesState())

      act(() => {
        result.current.setGames(mockGames)
      })

      expect(result.current.games).toEqual(mockGames)
    })

    it('setSessionGameIds replaces session IDs', () => {
      const { result } = renderHook(() => useGamesState())

      act(() => {
        result.current.setSessionGameIds([1, 2, 3])
      })

      expect(result.current.sessionGameIds).toEqual([1, 2, 3])
    })
  })
})
