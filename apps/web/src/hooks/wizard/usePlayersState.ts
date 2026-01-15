/**
 * Hook for managing player/user state in the wizard.
 * 
 * Single responsibility: User add/remove, organizer, BGG import, local users.
 * 
 * ## Usage
 * 
 * ```ts
 * const { users, addBggUser, addLocalUser, ... } = usePlayersState({
 *   onUserAdded,
 *   onNeedsApiKey,
 * })
 * ```
 */
import React, { useState, useCallback, useEffect } from 'react'
import type { GameRecord, UserRecord, UserPreferenceRecord } from '../../db/types'
import type { PlayersState, PlayersActions } from './types'
import * as dbService from '../../services/db'
import * as bggService from '../../services/bgg/bggService'
import { BggAuthError, BggRateLimitError, BggUserNotFoundError } from '../../services/bgg/errors'

export interface UsePlayersStateOptions {
  /** Callback when a user is added with their data */
  onUserAdded?: (
    user: UserRecord,
    games: GameRecord[],
    ratings: Record<number, number | undefined>,
    prefs: UserPreferenceRecord[],
    owners: Record<number, string[]>,
  ) => void
  /** Callback when user is removed */
  onUserRemoved?: (username: string) => void
  /** Callback when API key is needed */
  onNeedsApiKey?: () => void
  /** Initial users (for session restore) */
  initialUsers?: UserRecord[]
}

export interface UsePlayersStateResult extends PlayersState, PlayersActions {
  // Direct setters for external coordination
  setUsers: React.Dispatch<React.SetStateAction<UserRecord[]>>
  setExistingLocalUsers: React.Dispatch<React.SetStateAction<UserRecord[]>>
  setUserError: React.Dispatch<React.SetStateAction<string | null>>
  userRatings: Record<string, Record<number, number | undefined>>
  setUserRatings: React.Dispatch<React.SetStateAction<Record<string, Record<number, number | undefined>>>>
}

export function usePlayersState(options: UsePlayersStateOptions = {}): UsePlayersStateResult {
  const { onUserAdded, onUserRemoved, onNeedsApiKey, initialUsers } = options

  const [users, setUsers] = useState<UserRecord[]>(initialUsers ?? [])
  const [existingLocalUsers, setExistingLocalUsers] = useState<UserRecord[]>([])
  const [isLoadingUser, setIsLoadingUser] = useState(false)
  const [userError, setUserError] = useState<string | null>(null)
  const [needsApiKey, setNeedsApiKey] = useState(false)
  const [pendingBggUserNotFoundUsername, setPendingBggUserNotFoundUsername] = useState<string | null>(null)
  const [userRatings, setUserRatings] = useState<Record<string, Record<number, number | undefined>>>({})

  // Load existing local users on mount
  useEffect(() => {
    const loadLocalUsers = async () => {
      try {
        const localUsers = await dbService.getLocalUsers()
        setExistingLocalUsers(localUsers)
      } catch (err) {
        console.error('Failed to load local users:', err)
      }
    }
    loadLocalUsers()
  }, [])

  const clearUserError = useCallback(() => {
    setUserError(null)
  }, [])

  const clearNeedsApiKey = useCallback(() => {
    setNeedsApiKey(false)
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // BGG User Import
  // ─────────────────────────────────────────────────────────────────────────
  const addBggUser = useCallback(
    async (username: string) => {
      setIsLoadingUser(true)
      setUserError(null)

      try {
        const { games: newGames, user } = await bggService.syncUserCollectionToDb(username)

        setUsers((prev) => {
          if (prev.some((u) => u.username === username)) return prev
          return [...prev, user]
        })

        // Load ratings
        const userGameRecords = await dbService.getUserGames(username)
        const ratings: Record<number, number | undefined> = Object.fromEntries(
          userGameRecords.map((ug) => [ug.bggId, ug.rating]),
        )

        // Load game owners
        const owners = await dbService.getGameOwners(newGames.map((g) => g.bggId))

        // Notify parent
        onUserAdded?.(user, newGames, ratings, [], owners)
      } catch (err) {
        if (err instanceof BggUserNotFoundError) {
          setPendingBggUserNotFoundUsername(username)
          return
        }
        if (err instanceof BggAuthError || err instanceof BggRateLimitError) {
          setNeedsApiKey(true)
          onNeedsApiKey?.()
        }
        setUserError(err instanceof Error ? err.message : 'Failed to import BGG collection')
      } finally {
        setIsLoadingUser(false)
      }
    },
    [onUserAdded, onNeedsApiKey],
  )

  const confirmAddBggUserAnyway = useCallback(async () => {
    const username = pendingBggUserNotFoundUsername
    if (!username) return

    setIsLoadingUser(true)
    setUserError(null)

    try {
      const user = await dbService.createBggUser(username)

      setUsers((prev) => {
        if (prev.some((u) => u.username === username)) return prev
        return [...prev, user]
      })

      onUserAdded?.(user, [], {}, [], {})
    } catch (err) {
      setUserError(err instanceof Error ? err.message : 'Failed to add BGG user')
    } finally {
      setIsLoadingUser(false)
      setPendingBggUserNotFoundUsername(null)
    }
  }, [pendingBggUserNotFoundUsername, onUserAdded])

  const cancelAddBggUserAnyway = useCallback(() => {
    setPendingBggUserNotFoundUsername(null)
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // Local User Management
  // ─────────────────────────────────────────────────────────────────────────
  const addLocalUser = useCallback(
    async (nameOrUsername: string, isOrganizer?: boolean) => {
      try {
        const existingUser = await dbService.getUser(nameOrUsername)
        let user: UserRecord

        if (existingUser) {
          if (existingUser.isDeleted) {
            // Revive soft-deleted user
            user = await dbService.upsertUser({
              ...existingUser,
              isDeleted: false,
              isOrganizer: isOrganizer ?? existingUser.isOrganizer,
              isBggUser: false,
            })
            setExistingLocalUsers((prev) =>
              prev.some((u) => u.username === user.username) ? prev : [...prev, user],
            )
          } else {
            user = existingUser
            if (isOrganizer && !existingUser.isOrganizer) {
              await dbService.setUserAsOrganizer(nameOrUsername)
              user = { ...existingUser, isOrganizer: true }
            }
          }
        } else {
          user = await dbService.createLocalUser(nameOrUsername, undefined, isOrganizer)
          setExistingLocalUsers((prev) => [...prev, user])
        }

        if (users.some((u) => u.username === user.username)) {
          return // Already in session
        }

        setUsers((prev) => [...prev, user])

        // Load preferences and ratings
        const userPrefs = await dbService.getUserPreferences(user.username)
        const userGameRecords = await dbService.getUserGames(user.username)
        const ratings: Record<number, number | undefined> = {}
        for (const ug of userGameRecords) {
          ratings[ug.bggId] = ug.rating
        }

        // Load games and owners
        let userGames: GameRecord[] = []
        let owners: Record<number, string[]> = {}
        if (userGameRecords.length > 0) {
          userGames = await dbService.getGamesForUsers([user.username])
          const bggIds = userGames.map((g) => g.bggId)
          owners = await dbService.getGameOwners(bggIds)
        }

        onUserAdded?.(user, userGames, ratings, userPrefs, owners)
      } catch (err) {
        setUserError(err instanceof Error ? err.message : 'Failed to add user')
      }
    },
    [users, onUserAdded],
  )

  const setOrganizer = useCallback(async (username: string) => {
    try {
      await dbService.setUserAsOrganizer(username)
      setUsers((prev) =>
        prev.map((u) => ({ ...u, isOrganizer: u.username === username })),
      )
    } catch (err) {
      setUserError(err instanceof Error ? err.message : 'Failed to set organizer')
    }
  }, [])

  const removeUser = useCallback(
    (username: string) => {
      setUsers((prev) => prev.filter((u) => u.username !== username))
      onUserRemoved?.(username)
    },
    [onUserRemoved],
  )

  const deleteUserPermanently = useCallback(
    async (username: string) => {
      try {
        await dbService.deleteUser(username)
        setUsers((prev) => prev.filter((u) => u.username !== username))
        setExistingLocalUsers((prev) => prev.filter((u) => u.username !== username))
        onUserRemoved?.(username)
      } catch (err) {
        setUserError(err instanceof Error ? err.message : 'Failed to delete user')
      }
    },
    [onUserRemoved],
  )

  return {
    // State
    users,
    existingLocalUsers,
    isLoadingUser,
    userError,
    needsApiKey,
    pendingBggUserNotFoundUsername,
    userRatings,

    // Actions
    addBggUser,
    confirmAddBggUserAnyway,
    cancelAddBggUserAnyway,
    addLocalUser,
    removeUser,
    deleteUserPermanently,
    setOrganizer,
    clearUserError,
    clearNeedsApiKey,

    // Setters for external coordination
    setUsers,
    setExistingLocalUsers,
    setUserError,
    setUserRatings,
  }
}
