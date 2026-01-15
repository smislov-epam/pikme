/**
 * Tests for usePlayersState hook.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { usePlayersState } from './usePlayersState'
import { mockUsers, createMockUser } from './__tests__/fixtures'

// Mock services
vi.mock('../../services/db', () => ({
  getLocalUsers: vi.fn().mockResolvedValue([]),
  getUser: vi.fn().mockResolvedValue(null),
  createLocalUser: vi.fn().mockImplementation(async (name: string, _displayName?: string, isOrganizer?: boolean) => ({
    username: `${name}-abc123`,
    internalId: `${name}-abc123`,
    displayName: name,
    isBggUser: false,
    isOrganizer: isOrganizer ?? false,
    isDeleted: false,
  })),
  createBggUser: vi.fn().mockImplementation(async (username: string) => ({
    username,
    internalId: username,
    displayName: username,
    isBggUser: true,
    isOrganizer: false,
    isDeleted: false,
  })),
  upsertUser: vi.fn().mockImplementation(async (user) => user),
  setUserAsOrganizer: vi.fn().mockResolvedValue(undefined),
  deleteUser: vi.fn().mockResolvedValue(undefined),
  getUserGames: vi.fn().mockResolvedValue([]),
  getUserPreferences: vi.fn().mockResolvedValue([]),
  getGamesForUsers: vi.fn().mockResolvedValue([]),
  getGameOwners: vi.fn().mockResolvedValue({}),
}))

vi.mock('../../services/bgg/bggService', () => ({
  syncUserCollectionToDb: vi.fn().mockResolvedValue({
    games: [],
    user: {
      username: 'bgguser',
      internalId: 'bgguser',
      displayName: 'BGG User',
      isBggUser: true,
      isOrganizer: false,
    },
  }),
}))

vi.mock('../../services/bgg/errors', () => ({
  BggAuthError: class extends Error { name = 'BggAuthError' },
  BggRateLimitError: class extends Error { name = 'BggRateLimitError' },
  BggUserNotFoundError: class extends Error { name = 'BggUserNotFoundError' },
}))

describe('usePlayersState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('starts with empty users when no initial values', async () => {
      const { result } = renderHook(() => usePlayersState())

      await waitFor(() => {
        expect(result.current.users).toEqual([])
        expect(result.current.isLoadingUser).toBe(false)
      })
    })

    it('uses provided initial users', () => {
      const { result } = renderHook(() =>
        usePlayersState({ initialUsers: mockUsers }),
      )

      expect(result.current.users).toEqual(mockUsers)
    })

    it('loads existing local users on mount', async () => {
      const { getLocalUsers } = await import('../../services/db')
      vi.mocked(getLocalUsers).mockResolvedValueOnce(mockUsers)

      const { result } = renderHook(() => usePlayersState())

      await waitFor(() => {
        expect(result.current.existingLocalUsers).toEqual(mockUsers)
      })
    })
  })

  describe('addLocalUser', () => {
    it('creates new user and adds to session', async () => {
      const onUserAdded = vi.fn()
      const { result } = renderHook(() => usePlayersState({ onUserAdded }))

      await act(async () => {
        await result.current.addLocalUser('Alice')
      })

      expect(result.current.users).toHaveLength(1)
      expect(result.current.users[0].displayName).toBe('Alice')
      expect(onUserAdded).toHaveBeenCalled()
    })

    it('sets first user as organizer when specified', async () => {
      const { result } = renderHook(() => usePlayersState())

      await act(async () => {
        await result.current.addLocalUser('Alice', true)
      })

      expect(result.current.users[0].isOrganizer).toBe(true)
    })

    it('revives soft-deleted user', async () => {
      const { getUser, upsertUser } = await import('../../services/db')
      const deletedUser = { ...createMockUser({ displayName: 'Deleted' }), isDeleted: true }
      vi.mocked(getUser).mockResolvedValueOnce(deletedUser)
      vi.mocked(upsertUser).mockResolvedValueOnce({ ...deletedUser, isDeleted: false })

      const { result } = renderHook(() => usePlayersState())

      await act(async () => {
        await result.current.addLocalUser(deletedUser.username)
      })

      expect(upsertUser).toHaveBeenCalledWith(expect.objectContaining({ isDeleted: false }))
    })

    it('does not add user already in session', async () => {
      const existingUser = createMockUser({ displayName: 'Existing' })
      const { getUser } = await import('../../services/db')
      vi.mocked(getUser).mockResolvedValue(existingUser)

      const { result } = renderHook(() =>
        usePlayersState({ initialUsers: [existingUser] }),
      )

      await act(async () => {
        await result.current.addLocalUser(existingUser.username)
      })

      // Should still have only 1 user
      expect(result.current.users).toHaveLength(1)
    })
  })

  describe('addBggUser', () => {
    it('imports BGG user collection', async () => {
      const onUserAdded = vi.fn()
      const { result } = renderHook(() => usePlayersState({ onUserAdded }))

      await act(async () => {
        await result.current.addBggUser('bgguser')
      })

      expect(result.current.users).toHaveLength(1)
      expect(result.current.users[0].isBggUser).toBe(true)
      expect(onUserAdded).toHaveBeenCalled()
    })

    it('sets pending username on user not found error', async () => {
      const { syncUserCollectionToDb } = await import('../../services/bgg/bggService')
      const { BggUserNotFoundError } = await import('../../services/bgg/errors')
      vi.mocked(syncUserCollectionToDb).mockRejectedValueOnce(
        new BggUserNotFoundError('User not found'),
      )

      const { result } = renderHook(() => usePlayersState())

      await act(async () => {
        await result.current.addBggUser('unknownuser')
      })

      expect(result.current.pendingBggUserNotFoundUsername).toBe('unknownuser')
      expect(result.current.users).toHaveLength(0)
    })

    it('sets needsApiKey on auth error', async () => {
      const { syncUserCollectionToDb } = await import('../../services/bgg/bggService')
      const { BggAuthError } = await import('../../services/bgg/errors')
      vi.mocked(syncUserCollectionToDb).mockRejectedValueOnce(new BggAuthError('Need key'))

      const onNeedsApiKey = vi.fn()
      const { result } = renderHook(() => usePlayersState({ onNeedsApiKey }))

      await act(async () => {
        await result.current.addBggUser('someuser')
      })

      expect(result.current.needsApiKey).toBe(true)
      expect(onNeedsApiKey).toHaveBeenCalled()
    })
  })

  describe('confirmAddBggUserAnyway', () => {
    it('adds BGG user without collection', async () => {
      const { syncUserCollectionToDb } = await import('../../services/bgg/bggService')
      const { BggUserNotFoundError } = await import('../../services/bgg/errors')
      vi.mocked(syncUserCollectionToDb).mockRejectedValueOnce(
        new BggUserNotFoundError('Not found'),
      )

      const { result } = renderHook(() => usePlayersState())

      await act(async () => {
        await result.current.addBggUser('notfound')
      })

      expect(result.current.pendingBggUserNotFoundUsername).toBe('notfound')

      await act(async () => {
        await result.current.confirmAddBggUserAnyway()
      })

      expect(result.current.users).toHaveLength(1)
      expect(result.current.pendingBggUserNotFoundUsername).toBeNull()
    })
  })

  describe('cancelAddBggUserAnyway', () => {
    it('clears pending username', async () => {
      const { syncUserCollectionToDb } = await import('../../services/bgg/bggService')
      const { BggUserNotFoundError } = await import('../../services/bgg/errors')
      vi.mocked(syncUserCollectionToDb).mockRejectedValueOnce(
        new BggUserNotFoundError('Not found'),
      )

      const { result } = renderHook(() => usePlayersState())

      await act(async () => {
        await result.current.addBggUser('notfound')
      })

      act(() => {
        result.current.cancelAddBggUserAnyway()
      })

      expect(result.current.pendingBggUserNotFoundUsername).toBeNull()
    })
  })

  describe('setOrganizer', () => {
    it('updates organizer flag on all users', async () => {
      const { result } = renderHook(() =>
        usePlayersState({ initialUsers: mockUsers }),
      )

      await act(async () => {
        await result.current.setOrganizer('bob')
      })

      expect(result.current.users.find((u) => u.username === 'bob')?.isOrganizer).toBe(true)
      expect(result.current.users.find((u) => u.username === 'alice')?.isOrganizer).toBe(false)
    })
  })

  describe('removeUser', () => {
    it('removes user from session', () => {
      const onUserRemoved = vi.fn()
      const { result } = renderHook(() =>
        usePlayersState({ initialUsers: mockUsers, onUserRemoved }),
      )

      act(() => {
        result.current.removeUser('alice-abc123')
      })

      expect(result.current.users.find((u) => u.username === 'alice-abc123')).toBeUndefined()
      expect(onUserRemoved).toHaveBeenCalledWith('alice-abc123')
    })
  })

  describe('deleteUserPermanently', () => {
    it('deletes user from DB and session', async () => {
      const onUserRemoved = vi.fn()
      const { result } = renderHook(() =>
        usePlayersState({ initialUsers: mockUsers, onUserRemoved }),
      )

      await act(async () => {
        await result.current.deleteUserPermanently('alice-abc123')
      })

      expect(result.current.users.find((u) => u.username === 'alice-abc123')).toBeUndefined()
      expect(onUserRemoved).toHaveBeenCalledWith('alice-abc123')
    })
  })

  describe('clearUserError', () => {
    it('clears error state', async () => {
      const { getUser } = await import('../../services/db')
      vi.mocked(getUser).mockRejectedValueOnce(new Error('Test error'))

      const { result } = renderHook(() => usePlayersState())

      await act(async () => {
        await result.current.addLocalUser('test')
      })

      expect(result.current.userError).toBe('Test error')

      act(() => {
        result.current.clearUserError()
      })

      expect(result.current.userError).toBeNull()
    })
  })
})
