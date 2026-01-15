/**
 * Tests for useRecommendationState hook
 */
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useRecommendationState } from './useRecommendationState'
import {
  mockUsers,
  mockGames,
  mockPreferences,
  mockDefaultFilters,
} from './__tests__/fixtures'

import type { GameRecord } from '../../db/types'

// Mock the computeRecommendation service
vi.mock('../../services/recommendation/computeRecommendation', () => ({
  computeRecommendation: vi.fn(({ games, promotedPickBggId }: { games: GameRecord[], promotedPickBggId: number | null }) => {
    if (games.length === 0) {
      return { topPick: null, alternatives: [], vetoed: [] }
    }

    // If a game is promoted, reorder to put it first
    let orderedGames = [...games]
    if (promotedPickBggId !== null) {
      const promotedIndex = orderedGames.findIndex((g) => g.bggId === promotedPickBggId)
      if (promotedIndex > 0) {
        const [promoted] = orderedGames.splice(promotedIndex, 1)
        orderedGames = [promoted, ...orderedGames]
      }
    }

    return {
      topPick: {
        game: orderedGames[0],
        score: 10,
        matchReasons: ['Test reason'],
      },
      alternatives: orderedGames.slice(1).map((g: GameRecord, i: number) => ({
        game: g,
        score: 8 - i,
        matchReasons: ['Alt reason'],
      })),
      vetoed: [],
    }
  }),
}))

function createDefaultOptions() {
  return {
    filteredGames: mockGames,
    preferences: mockPreferences,
    users: mockUsers,
    filters: mockDefaultFilters,
  }
}

describe('useRecommendationState', () => {
  describe('initialization', () => {
    it('computes recommendation from filtered games', () => {
      const options = createDefaultOptions()
      
      const { result } = renderHook(() => useRecommendationState(options))

      expect(result.current.recommendation.topPick).toBeDefined()
      expect(result.current.recommendation.topPick?.game.bggId).toBe(mockGames[0].bggId)
    })

    it('returns empty recommendation when no filtered games', () => {
      const options = {
        ...createDefaultOptions(),
        filteredGames: [],
      }

      const { result } = renderHook(() => useRecommendationState(options))

      expect(result.current.recommendation.topPick).toBeNull()
      expect(result.current.recommendation.alternatives).toHaveLength(0)
    })

    it('has no promoted pick initially', () => {
      const { result } = renderHook(() => useRecommendationState(createDefaultOptions()))

      expect(result.current.promotedPickBggId).toBeNull()
    })
  })

  describe('promoteAlternativeToTopPick', () => {
    it('promotes an alternative to top pick', () => {
      const options = createDefaultOptions()
      const { result } = renderHook(() => useRecommendationState(options))

      // Initially first game is top pick
      expect(result.current.recommendation.topPick?.game.bggId).toBe(mockGames[0].bggId)

      // Promote the second game (first alternative)
      act(() => {
        result.current.promoteAlternativeToTopPick(mockGames[1].bggId)
      })

      // Now the second game should be top pick
      expect(result.current.recommendation.topPick?.game.bggId).toBe(mockGames[1].bggId)
      expect(result.current.promotedPickBggId).toBe(mockGames[1].bggId)
    })

    it('moves the original top pick to alternatives when promoting', () => {
      const options = createDefaultOptions()
      const { result } = renderHook(() => useRecommendationState(options))

      const originalTopPickBggId = result.current.recommendation.topPick?.game.bggId

      act(() => {
        result.current.promoteAlternativeToTopPick(mockGames[1].bggId)
      })

      // Original top pick should now be in alternatives
      const alternativeBggIds = result.current.recommendation.alternatives.map((a) => a.game.bggId)
      expect(alternativeBggIds).toContain(originalTopPickBggId)
    })

    it('can clear promoted pick via setPromotedPickBggId', () => {
      const options = createDefaultOptions()
      const { result } = renderHook(() => useRecommendationState(options))

      act(() => {
        result.current.promoteAlternativeToTopPick(mockGames[1].bggId)
      })

      expect(result.current.promotedPickBggId).toBe(mockGames[1].bggId)

      act(() => {
        result.current.setPromotedPickBggId(null)
      })

      expect(result.current.promotedPickBggId).toBeNull()
      // Top pick should revert to original
      expect(result.current.recommendation.topPick?.game.bggId).toBe(mockGames[0].bggId)
    })
  })

  describe('reactivity', () => {
    it('recomputes recommendation when filteredGames change', () => {
      const options = createDefaultOptions()
      const { result, rerender } = renderHook(
        (props) => useRecommendationState(props),
        { initialProps: options },
      )

      expect(result.current.recommendation.topPick?.game.bggId).toBe(mockGames[0].bggId)

      // Change filtered games
      const newGames = [mockGames[2], mockGames[3]]
      rerender({ ...options, filteredGames: newGames })

      expect(result.current.recommendation.topPick?.game.bggId).toBe(mockGames[2].bggId)
    })

    it('recomputes recommendation when preferences change', () => {
      const options = createDefaultOptions()
      const { result, rerender } = renderHook(
        (props) => useRecommendationState(props),
        { initialProps: options },
      )

      // Initial render
      expect(result.current.recommendation).toBeDefined()

      // Change preferences
      const newPreferences = { ...mockPreferences, 'alice': [] }
      rerender({ ...options, preferences: newPreferences })

      // Hook should still return a valid recommendation
      expect(result.current.recommendation).toBeDefined()
    })

    it('recomputes recommendation when users change', () => {
      const options = createDefaultOptions()
      const { result, rerender } = renderHook(
        (props) => useRecommendationState(props),
        { initialProps: options },
      )

      // Initial render with 3 users
      expect(result.current.recommendation).toBeDefined()

      // Change to 1 user
      rerender({ ...options, users: [mockUsers[0]] })

      expect(result.current.recommendation).toBeDefined()
    })

    it('recomputes recommendation when playerCount filter changes', () => {
      const options = createDefaultOptions()
      const { result, rerender } = renderHook(
        (props) => useRecommendationState(props),
        { initialProps: options },
      )

      expect(result.current.recommendation).toBeDefined()

      // Change player count
      rerender({
        ...options,
        filters: { ...mockDefaultFilters, playerCount: 6 },
      })

      expect(result.current.recommendation).toBeDefined()
    })
  })
})
