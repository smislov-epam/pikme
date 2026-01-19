import { useState, useCallback, useMemo } from 'react'
import type { UserRecord } from '../../../db/types'

interface UsePreferencesUserSelectionOptions {
  users: UserRecord[]
  readOnly?: boolean
  readOnlyUsername?: string
  readOnlyUsernames?: string[]
}

interface UsePreferencesUserSelectionResult {
  selectedUser: string
  setSelectedUser: (username: string) => void
  isSelectedUserReadOnly: boolean
  readOnlyUsernameSet: Set<string>
}

/**
 * Hook to manage user selection in preferences step.
 * Handles:
 * - Initial selection of first editable user
 * - Auto-switching away from read-only users when selection becomes invalid
 * - Tracking manual user selection via state flag
 */
export function usePreferencesUserSelection({
  users,
  readOnly = false,
  readOnlyUsername,
  readOnlyUsernames = [],
}: UsePreferencesUserSelectionOptions): UsePreferencesUserSelectionResult {
  // Track whether user has manually selected (state, not ref, for React 19 compliance)
  const [didUserSelect, setDidUserSelect] = useState(false)

  const readOnlyUsernameSet = useMemo(() => new Set(readOnlyUsernames), [readOnlyUsernames])

  // Compute derived username list for stable deps
  const usernames = useMemo(() => users.map((u) => u.username), [users])
  const readOnlyNamesKey = useMemo(() => readOnlyUsernames.join(','), [readOnlyUsernames])

  const pickFirstEditableUsername = useCallback((): string => {
    return users.find((u) => !readOnlyUsernameSet.has(u.username))?.username ?? users[0]?.username ?? ''
  }, [readOnlyUsernameSet, users])

  // Initialize state with lazy initializer
  const [selectedUserState, setSelectedUserState] = useState(() => pickFirstEditableUsername())

  // Compute the effective selected user using derived state pattern.
  // We calculate the "correct" value purely from props without side effects.
  const effectiveSelectedUser = useMemo(() => {
    // In readOnly mode with a specific username, always use that
    if (readOnly && readOnlyUsername) return readOnlyUsername

    if (users.length === 0) return ''

    const exists = usernames.includes(selectedUserState)
    if (!exists) {
      // User no longer exists - pick first editable
      return pickFirstEditableUsername()
    }

    // If user manually selected, keep their choice even if read-only
    if (didUserSelect) {
      return selectedUserState
    }

    // Auto-switch away from read-only users
    if (readOnlyUsernameSet.has(selectedUserState)) {
      return pickFirstEditableUsername()
    }

    return selectedUserState
    // eslint-disable-next-line react-hooks/exhaustive-deps -- readOnlyNamesKey tracks readOnlyUsernames changes
  }, [readOnly, readOnlyUsername, users.length, usernames, selectedUserState, didUserSelect, readOnlyUsernameSet, pickFirstEditableUsername, readOnlyNamesKey])

  // Sync internal state when effective differs (for controlled behavior)
  // This is a state synchronization, not a side effect
  if (effectiveSelectedUser !== selectedUserState && !didUserSelect) {
    setSelectedUserState(effectiveSelectedUser)
  }

  // Wrapper to track manual selections
  const setSelectedUser = useCallback((username: string) => {
    setDidUserSelect(true)
    setSelectedUserState(username)
  }, [])

  // Reset manual selection flag when users list changes substantially
  // (using a separate key comparison to detect changes)
  const usernamesKey = usernames.join(',')
  const [lastUsernamesKey, setLastUsernamesKey] = useState(usernamesKey)
  if (usernamesKey !== lastUsernamesKey) {
    setLastUsernamesKey(usernamesKey)
    if (!usernames.includes(selectedUserState)) {
      setDidUserSelect(false)
    }
  }

  const isSelectedUserReadOnly = useMemo(() => {
    if (readOnly) return true
    return readOnlyUsernameSet.has(effectiveSelectedUser)
  }, [readOnly, readOnlyUsernameSet, effectiveSelectedUser])

  return {
    selectedUser: effectiveSelectedUser,
    setSelectedUser,
    isSelectedUserReadOnly,
    readOnlyUsernameSet,
  }
}
