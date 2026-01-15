/**
 * Tests for usePreferencesState hook.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePreferencesState } from './usePreferencesState'
import { mockGames, mockPreferences, mockUserRatings } from './__tests__/fixtures'

// Mock DB service
vi.mock('../../services/db', () => ({
  updateGamePreference: vi.fn().mockResolvedValue(undefined),
  deleteUserPreference: vi.fn().mockResolvedValue(undefined),
  setUserPreferenceRanks: vi.fn().mockResolvedValue(undefined),
  saveUserPreferences: vi.fn().mockResolvedValue(undefined),
  clearUserPreferences: vi.fn().mockResolvedValue(undefined),
}))

describe('usePreferencesState', () => {
  const defaultOptions = {
    filteredGames: mockGames,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('starts with empty preferences when none provided', () => {
      const { result } = renderHook(() => usePreferencesState(defaultOptions))

      expect(result.current.preferences).toEqual({})
      expect(result.current.userRatings).toEqual({})
    })

    it('uses provided initial preferences', () => {
      const { result } = renderHook(() =>
        usePreferencesState({
          ...defaultOptions,
          initialPreferences: mockPreferences,
          initialRatings: mockUserRatings,
        }),
      )

      expect(result.current.preferences).toEqual(mockPreferences)
      expect(result.current.userRatings).toEqual(mockUserRatings)
    })
  })

  describe('updatePreference', () => {
    it('adds new preference for user', async () => {
      const { result } = renderHook(() => usePreferencesState(defaultOptions))

      await act(async () => {
        await result.current.updatePreference('alice', 174430, { isTopPick: true })
      })

      expect(result.current.preferences['alice']).toHaveLength(1)
      expect(result.current.preferences['alice'][0].bggId).toBe(174430)
      expect(result.current.preferences['alice'][0].isTopPick).toBe(true)
    })

    it('updates existing preference', async () => {
      const { result } = renderHook(() =>
        usePreferencesState({
          ...defaultOptions,
          initialPreferences: mockPreferences,
        }),
      )

      await act(async () => {
        // Alice already has preference for 174430 as top pick
        await result.current.updatePreference('alice-abc123', 174430, { isDisliked: true })
      })

      const alicePrefs = result.current.preferences['alice-abc123']
      const updated = alicePrefs.find((p) => p.bggId === 174430)
      expect(updated?.isDisliked).toBe(true)
      // When disliked, should not be top pick
      expect(updated?.isTopPick).toBe(false)
    })
  })

  describe('clearPreference', () => {
    it('removes preference for game', async () => {
      const { result } = renderHook(() =>
        usePreferencesState({
          ...defaultOptions,
          initialPreferences: mockPreferences,
        }),
      )

      const initialCount = result.current.preferences['alice'].length

      await act(async () => {
        await result.current.clearPreference('alice', 174430)
      })

      expect(result.current.preferences['alice'].length).toBe(initialCount - 1)
      expect(
        result.current.preferences['alice'].find((p) => p.bggId === 174430),
      ).toBeUndefined()
    })
  })

  describe('reorderPreferences', () => {
    it('updates ranks based on new order', () => {
      const { result } = renderHook(() =>
        usePreferencesState({
          ...defaultOptions,
          initialPreferences: {
            alice: [
              { username: 'alice', bggId: 1, rank: 1, isTopPick: false, isDisliked: false, updatedAt: '' },
              { username: 'alice', bggId: 2, rank: 2, isTopPick: false, isDisliked: false, updatedAt: '' },
            ],
          },
        }),
      )

      act(() => {
        // Reverse the order
        result.current.reorderPreferences('alice', [2, 1])
      })

      const alicePrefs = result.current.preferences['alice']
      expect(alicePrefs.find((p) => p.bggId === 2)?.rank).toBe(1)
      expect(alicePrefs.find((p) => p.bggId === 1)?.rank).toBe(2)
    })

    it('adds new items when dragged into ranked list', () => {
      const { result } = renderHook(() =>
        usePreferencesState({
          ...defaultOptions,
          initialPreferences: {
            alice: [],
          },
        }),
      )

      act(() => {
        result.current.reorderPreferences('alice', [174430, 167791])
      })

      expect(result.current.preferences['alice']).toHaveLength(2)
      expect(result.current.preferences['alice'][0].rank).toBe(1)
      expect(result.current.preferences['alice'][1].rank).toBe(2)
    })
  })

  describe('autoSortByRating', () => {
    it('sorts games by user rating descending', async () => {
      const { result } = renderHook(() =>
        usePreferencesState({
          ...defaultOptions,
          initialRatings: {
            alice: {
              174430: 9.0,
              167791: 8.0,
              230802: 7.0,
              266192: 6.0,
            },
          },
        }),
      )

      await act(async () => {
        await result.current.autoSortByRating('alice')
      })

      const alicePrefs = result.current.preferences['alice']

      // Top 3 should be top picks (no rank)
      const topPicks = alicePrefs.filter((p) => p.isTopPick)
      expect(topPicks).toHaveLength(3)

      // Highest rated should be top pick
      expect(topPicks.find((p) => p.bggId === 174430)).toBeDefined()
    })

    it('preserves disliked games', async () => {
      const { result } = renderHook(() =>
        usePreferencesState({
          ...defaultOptions,
          initialPreferences: {
            alice: [
              { username: 'alice', bggId: 174430, rank: undefined, isTopPick: false, isDisliked: true, updatedAt: '' },
            ],
          },
          initialRatings: {
            alice: { 174430: 9.0, 167791: 8.0 },
          },
        }),
      )

      await act(async () => {
        await result.current.autoSortByRating('alice')
      })

      const disliked = result.current.preferences['alice'].find((p) => p.bggId === 174430)
      expect(disliked?.isDisliked).toBe(true)
    })
  })

  describe('markRestNeutral', () => {
    it('clears all preferences for user', async () => {
      const { result } = renderHook(() =>
        usePreferencesState({
          ...defaultOptions,
          initialPreferences: mockPreferences,
        }),
      )

      await act(async () => {
        await result.current.markRestNeutral('alice-abc123')
      })

      expect(result.current.preferences['alice-abc123']).toEqual([])
    })
  })

  describe('direct setters', () => {
    it('setPreferences allows direct state update', () => {
      const { result } = renderHook(() => usePreferencesState(defaultOptions))

      act(() => {
        result.current.setPreferences(mockPreferences)
      })

      expect(result.current.preferences).toEqual(mockPreferences)
    })

    it('setUserRatings allows direct state update', () => {
      const { result } = renderHook(() => usePreferencesState(defaultOptions))

      act(() => {
        result.current.setUserRatings(mockUserRatings)
      })

      expect(result.current.userRatings).toEqual(mockUserRatings)
    })
  })
})
