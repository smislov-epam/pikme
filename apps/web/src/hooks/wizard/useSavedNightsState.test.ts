/**
 * Tests for useSavedNightsState hook
 */
import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSavedNightsState } from './useSavedNightsState'
import * as dbService from '../../services/db'
import {
  mockUsers,
  mockGames,
  mockSavedNights,
  mockDefaultFilters,
  mockRecommendation,
} from './__tests__/fixtures'

vi.mock('../../services/db')

const mockedDb = vi.mocked(dbService)

function createDefaultOptions() {
  return {
    recommendation: mockRecommendation,
    users: mockUsers,
    filters: mockDefaultFilters,
    sessionGameIds: [1, 2],
    excludedBggIds: [] as number[],
    onLoadNight: vi.fn(),
  }
}

describe('useSavedNightsState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedDb.getSavedNights.mockResolvedValue(mockSavedNights)
  })

  describe('initialization', () => {
    it('loads saved nights on mount', async () => {
      const options = createDefaultOptions()
      
      renderHook(() => useSavedNightsState(options))

      await waitFor(() => {
        expect(mockedDb.getSavedNights).toHaveBeenCalled()
      })
    })

    it('handles error loading saved nights', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockedDb.getSavedNights.mockRejectedValue(new Error('DB error'))
      const options = createDefaultOptions()

      renderHook(() => useSavedNightsState(options))

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to load saved nights:', expect.any(Error))
      })
      consoleSpy.mockRestore()
    })
  })

  describe('saveNight', () => {
    it('saves night with current session state', async () => {
      mockedDb.saveNight.mockResolvedValue(mockSavedNights[0])
      const options = createDefaultOptions()

      const { result } = renderHook(() => useSavedNightsState(options))

      await act(async () => {
        await result.current.saveNight('Game Night 2024', 'Fun night!')
      })

      expect(mockedDb.saveNight).toHaveBeenCalledWith({
        name: 'Game Night 2024',
        description: 'Fun night!',
        organizerUsername: 'alice',
        usernames: ['alice', 'bob', 'charlie'],
        gameIds: [1, 2],
        filters: expect.objectContaining({
          playerCount: 4,
          mode: 'any',
        }),
        pick: {
          bggId: mockRecommendation.topPick!.game.bggId,
          name: mockRecommendation.topPick!.game.name,
          score: mockRecommendation.topPick!.score,
        },
        alternatives: mockRecommendation.alternatives.map((a) => ({
          bggId: a.game.bggId,
          name: a.game.name,
          score: a.score,
        })),
      })
    })

    it('does not save if no top pick', async () => {
      const options = {
        ...createDefaultOptions(),
        recommendation: { topPick: null, alternatives: [], vetoed: [] },
      }

      const { result } = renderHook(() => useSavedNightsState(options))

      await act(async () => {
        await result.current.saveNight('Test Night')
      })

      expect(mockedDb.saveNight).not.toHaveBeenCalled()
    })

    it('excludes games from sessionGameIds that are in excludedBggIds', async () => {
      mockedDb.saveNight.mockResolvedValue(mockSavedNights[0])
      const options = {
        ...createDefaultOptions(),
        sessionGameIds: [1, 2, 3],
        excludedBggIds: [2],
      }

      const { result } = renderHook(() => useSavedNightsState(options))

      await act(async () => {
        await result.current.saveNight('Night')
      })

      expect(mockedDb.saveNight).toHaveBeenCalledWith(
        expect.objectContaining({
          gameIds: [1, 3],
        }),
      )
    })
  })

  describe('loadSavedNight', () => {
    it('loads users, games, preferences, and ratings from saved night', async () => {
      const savedNight = mockSavedNights[0]
      mockedDb.getSavedNight.mockResolvedValue(savedNight)
      mockedDb.getUser.mockImplementation(async (username) =>
        mockUsers.find((u) => u.username === username),
      )
      mockedDb.getGames.mockResolvedValue(mockGames)
      mockedDb.getGameOwners.mockResolvedValue({ 1: ['alice'] })
      mockedDb.getUserPreferences.mockResolvedValue([])
      mockedDb.getUserGames.mockResolvedValue([])
      mockedDb.setUserAsOrganizer.mockResolvedValue()

      const onLoadNight = vi.fn()
      const options = { ...createDefaultOptions(), onLoadNight }

      const { result } = renderHook(() => useSavedNightsState(options))

      await act(async () => {
        await result.current.loadSavedNight(1)
      })

      expect(onLoadNight).toHaveBeenCalledWith(
        expect.objectContaining({
          users: expect.arrayContaining([
            expect.objectContaining({ username: 'alice' }),
            expect.objectContaining({ username: 'bob' }),
          ]),
          games: mockGames,
          sessionGameIds: savedNight.data.gameIds,
          gameOwners: { 1: ['alice'] },
        }),
      )
    })

    it('creates local user if user not found in DB', async () => {
      const savedNight = {
        ...mockSavedNights[0],
        data: {
          ...mockSavedNights[0].data,
          usernames: ['newuser'],
          organizerUsername: undefined,
        },
      }
      mockedDb.getSavedNight.mockResolvedValue(savedNight)
      mockedDb.getUser.mockResolvedValue(undefined)
      mockedDb.createLocalUser.mockImplementation(async (username, displayName, isOrg) => ({
        username,
        internalId: username,
        displayName: displayName ?? username,
        isBggUser: false,
        isOrganizer: isOrg ?? false,
      }))
      mockedDb.getGames.mockResolvedValue([])
      mockedDb.getGameOwners.mockResolvedValue({})
      mockedDb.getUserPreferences.mockResolvedValue([])
      mockedDb.getUserGames.mockResolvedValue([])

      const onLoadNight = vi.fn()
      const options = { ...createDefaultOptions(), onLoadNight }

      const { result } = renderHook(() => useSavedNightsState(options))

      await act(async () => {
        await result.current.loadSavedNight(1)
      })

      expect(mockedDb.createLocalUser).toHaveBeenCalledWith('newuser', 'newuser', true)
    })

    it('handles not found saved night', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockedDb.getSavedNight.mockResolvedValue(undefined)

      const { result } = renderHook(() => useSavedNightsState(createDefaultOptions()))

      await act(async () => {
        await result.current.loadSavedNight(999)
      })

      expect(consoleSpy).toHaveBeenCalledWith('Saved night not found')
      consoleSpy.mockRestore()
    })

    it('restores sessionGameIds even when games are skipped', async () => {
      const savedNight = {
        ...mockSavedNights[0],
        data: {
          ...mockSavedNights[0].data,
          gameIds: [11, 22, 33],
        },
      }

      mockedDb.getSavedNight.mockResolvedValue(savedNight)
      mockedDb.getUser.mockImplementation(async (username) =>
        mockUsers.find((u) => u.username === username),
      )
      mockedDb.getGames.mockResolvedValue([])
      mockedDb.getGameOwners.mockResolvedValue({})
      mockedDb.getUserPreferences.mockResolvedValue([])
      mockedDb.getUserGames.mockResolvedValue([])

      const onLoadNight = vi.fn()
      const options = { ...createDefaultOptions(), onLoadNight }

      const { result } = renderHook(() => useSavedNightsState(options))

      await act(async () => {
        await result.current.loadSavedNight(1, { includeGames: false })
      })

      expect(onLoadNight).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionGameIds: [11, 22, 33],
          games: [],
          gameOwners: {},
        }),
      )
    })
  })

  describe('loadSavedNights', () => {
    it('refreshes the saved nights list', async () => {
      const newNights = [...mockSavedNights, { ...mockSavedNights[0], id: 99 }]
      mockedDb.getSavedNights.mockResolvedValue(newNights)

      const { result } = renderHook(() => useSavedNightsState(createDefaultOptions()))

      await act(async () => {
        await result.current.loadSavedNights()
      })

      // getSavedNights called on mount + loadSavedNights
      expect(mockedDb.getSavedNights).toHaveBeenCalledTimes(2)
    })
  })
})
