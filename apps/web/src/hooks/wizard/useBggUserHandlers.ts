import { useCallback } from 'react'
import type { UserRecord } from '../../db/types'
import { useToast } from '../../services/toast'
import { findUsersWithSameName } from '../../services/db/userIdService'

export interface PendingDuplicateUser {
  name: string
  existingUsers: UserRecord[]
}

export interface UseBggUserHandlersProps {
  users: UserRecord[]
  existingLocalUsers: UserRecord[]
  onSetExistingLocalUsers: React.Dispatch<React.SetStateAction<UserRecord[]>>
  onAddBggUser: (username: string) => Promise<void>
  onAddLocalUser: (name: string, isOrganizer?: boolean, options?: { forceNew?: boolean }) => Promise<void>
  onAddGameToSession: (bggId: number) => void
  setPendingBggMapping: (username: string | null) => void
  setPendingDuplicateUser: (user: PendingDuplicateUser | null) => void
  setSelectedLocalUsers: React.Dispatch<React.SetStateAction<string[]>>
}

export function useBggUserHandlers(props: UseBggUserHandlersProps) {
  const {
    users, existingLocalUsers, onSetExistingLocalUsers,
    onAddBggUser, onAddLocalUser, onAddGameToSession,
    setPendingBggMapping, setPendingDuplicateUser, setSelectedLocalUsers,
  } = props

  const toast = useToast()

  const handleLinkBggToExisting = useCallback(async (user: UserRecord, pendingBggMapping: string | null) => {
    if (!pendingBggMapping) return
    const bggUsername = pendingBggMapping
    setPendingBggMapping(null)

    try {
      const { syncBggCollectionToExistingUser } = await import('../../services/bgg/bggService')
      const { games: syncedGames, user: updatedUser } = await syncBggCollectionToExistingUser(
        user.username,
        bggUsername
      )
      onSetExistingLocalUsers((prev) =>
        prev.map((u) => (u.username === updatedUser.username ? updatedUser : u))
      )
      const isOrganizer = users.length === 0
      await onAddLocalUser(updatedUser.username, isOrganizer)
      for (const game of syncedGames) {
        onAddGameToSession(game.bggId)
      }
      toast.success(`Linked BGG "${bggUsername}" to ${updatedUser.displayName || updatedUser.username} - synced ${syncedGames.length} games`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to link BGG account')
    }
  }, [users.length, onSetExistingLocalUsers, onAddLocalUser, onAddGameToSession, setPendingBggMapping, toast])

  const handleCreateBggUser = useCallback(async (displayName: string, pendingBggMapping: string | null) => {
    if (!pendingBggMapping) return
    const bggUsername = pendingBggMapping
    setPendingBggMapping(null)

    try {
      const isOrganizer = users.length === 0
      await onAddLocalUser(displayName, isOrganizer)
      const { syncBggCollectionToExistingUser } = await import('../../services/bgg/bggService')
      const { getLocalUsers } = await import('../../services/db')
      const allUsers = await getLocalUsers()
      const newUser = allUsers.find(u => 
        u.displayName === displayName && !u.bggUsername && !u.isDeleted
      )
      if (newUser) {
        const { games: syncedGames, user: updatedUser } = await syncBggCollectionToExistingUser(
          newUser.username,
          bggUsername
        )
        onSetExistingLocalUsers((prev) =>
          prev.map((u) => (u.username === updatedUser.username ? updatedUser : u))
        )
        for (const game of syncedGames) {
          onAddGameToSession(game.bggId)
        }
        toast.success(`Created "${displayName}" with BGG collection from "${bggUsername}" - synced ${syncedGames.length} games`)
      } else {
        await onAddBggUser(bggUsername)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create user with BGG collection')
    }
  }, [users.length, onAddLocalUser, onSetExistingLocalUsers, onAddGameToSession, onAddBggUser, setPendingBggMapping, toast])

  const handleCancelBggMapping = useCallback(() => {
    setPendingBggMapping(null)
  }, [setPendingBggMapping])

  const handleAddUser = useCallback(async (mode: 'local' | 'bgg', inputValue: string) => {
    if (!inputValue.trim()) return false
    if (mode === 'bgg') {
      setPendingBggMapping(inputValue.trim())
    } else {
      const trimmedName = inputValue.trim()
      const duplicates = findUsersWithSameName(trimmedName, existingLocalUsers)
      if (duplicates.length > 0) {
        setPendingDuplicateUser({ name: trimmedName, existingUsers: duplicates })
        return false
      }
      const isOrganizer = users.length === 0
      await onAddLocalUser(trimmedName, isOrganizer)
    }
    return true
  }, [existingLocalUsers, users.length, onAddLocalUser, setPendingBggMapping, setPendingDuplicateUser])

  const handleSelectExistingUser = useCallback(async (user: UserRecord) => {
    const isOrganizer = users.length === 0
    await onAddLocalUser(user.username, isOrganizer)
    setSelectedLocalUsers((prev) => [...prev, user.username])
    setPendingDuplicateUser(null)
  }, [users.length, onAddLocalUser, setSelectedLocalUsers, setPendingDuplicateUser])

  const handleCreateNewDuplicateUser = useCallback(async (pendingDuplicateUser: PendingDuplicateUser | null) => {
    if (!pendingDuplicateUser) return
    const isOrganizer = users.length === 0
    await onAddLocalUser(pendingDuplicateUser.name, isOrganizer, { forceNew: true })
    setPendingDuplicateUser(null)
  }, [users.length, onAddLocalUser, setPendingDuplicateUser])

  const handleCancelDuplicateUser = useCallback(() => {
    setPendingDuplicateUser(null)
  }, [setPendingDuplicateUser])

  return {
    handleLinkBggToExisting,
    handleCreateBggUser,
    handleCancelBggMapping,
    handleAddUser,
    handleSelectExistingUser,
    handleCreateNewDuplicateUser,
    handleCancelDuplicateUser,
  }
}
