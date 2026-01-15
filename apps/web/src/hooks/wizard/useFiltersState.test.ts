/**
 * Tests for useFiltersState hook.
 */
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFiltersState } from './useFiltersState'
import { mockGames, mockDefaultFilters, mockUserRatings } from './__tests__/fixtures'

describe('useFiltersState', () => {
  const defaultOptions = {
    sessionGames: mockGames,
    userRatings: mockUserRatings,
  }

  describe('initialization', () => {
    it('uses DEFAULT_FILTERS when no initial filters provided', () => {
      const { result } = renderHook(() => useFiltersState(defaultOptions))

      expect(result.current.filters.playerCount).toBe(4)
      expect(result.current.filters.mode).toBe('any')
    })

    it('uses provided initial filters', () => {
      const initialFilters = { ...mockDefaultFilters, playerCount: 6 }
      const { result } = renderHook(() =>
        useFiltersState({ ...defaultOptions, initialFilters }),
      )

      expect(result.current.filters.playerCount).toBe(6)
    })
  })

  describe('filter actions', () => {
    it('setPlayerCount updates player count', () => {
      const { result } = renderHook(() => useFiltersState(defaultOptions))

      act(() => {
        result.current.setPlayerCount(3)
      })

      expect(result.current.filters.playerCount).toBe(3)
    })

    it('setTimeRange updates time range', () => {
      const { result } = renderHook(() => useFiltersState(defaultOptions))

      act(() => {
        result.current.setTimeRange({ min: 30, max: 90 })
      })

      expect(result.current.filters.timeRange).toEqual({ min: 30, max: 90 })
    })

    it('setMode updates game mode', () => {
      const { result } = renderHook(() => useFiltersState(defaultOptions))

      act(() => {
        result.current.setMode('coop')
      })

      expect(result.current.filters.mode).toBe('coop')
    })

    it('setExcludeLowRated updates threshold', () => {
      const { result } = renderHook(() => useFiltersState(defaultOptions))

      act(() => {
        result.current.setExcludeLowRated(6)
      })

      expect(result.current.filters.excludeLowRatedThreshold).toBe(6)
    })

    it('setAgeRange updates age range', () => {
      const { result } = renderHook(() => useFiltersState(defaultOptions))

      act(() => {
        result.current.setAgeRange({ min: 10, max: 18 })
      })

      expect(result.current.filters.ageRange).toEqual({ min: 10, max: 18 })
    })

    it('setComplexityRange updates complexity range', () => {
      const { result } = renderHook(() => useFiltersState(defaultOptions))

      act(() => {
        result.current.setComplexityRange({ min: 2, max: 4 })
      })

      expect(result.current.filters.complexityRange).toEqual({ min: 2, max: 4 })
    })

    it('setRatingRange updates rating range', () => {
      const { result } = renderHook(() => useFiltersState(defaultOptions))

      act(() => {
        result.current.setRatingRange({ min: 7, max: 10 })
      })

      expect(result.current.filters.ratingRange).toEqual({ min: 7, max: 10 })
    })
  })

  describe('filtered games derivation', () => {
    it('returns all games when filters are permissive', () => {
      const { result } = renderHook(() => useFiltersState(defaultOptions))

      // Default filters should include most games
      expect(result.current.filteredGames.length).toBeGreaterThan(0)
    })

    it('filters games by player count', () => {
      const { result } = renderHook(() => useFiltersState(defaultOptions))

      // Set player count to 2 - should filter out games that don't support 2 players
      act(() => {
        result.current.setPlayerCount(2)
      })

      // All remaining games should support 2 players
      result.current.filteredGames.forEach((game) => {
        if (game.minPlayers && game.maxPlayers) {
          expect(game.minPlayers).toBeLessThanOrEqual(2)
          expect(game.maxPlayers).toBeGreaterThanOrEqual(2)
        }
      })
    })

    it('updates filtered games when session games change', () => {
      const { result, rerender } = renderHook(
        (props) => useFiltersState(props),
        { initialProps: defaultOptions },
      )

      const initialCount = result.current.filteredGames.length

      // Rerender with fewer games
      rerender({
        ...defaultOptions,
        sessionGames: mockGames.slice(0, 2),
      })

      expect(result.current.filteredGames.length).toBeLessThanOrEqual(initialCount)
    })
  })

  describe('setFilters direct setter', () => {
    it('allows direct filter state replacement', () => {
      const { result } = renderHook(() => useFiltersState(defaultOptions))

      const newFilters = {
        ...mockDefaultFilters,
        playerCount: 5,
        mode: 'competitive' as const,
      }

      act(() => {
        result.current.setFilters(newFilters)
      })

      expect(result.current.filters).toEqual(newFilters)
    })
  })
})
