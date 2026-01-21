import { useState, useCallback } from 'react'
import type { GameRecord, UserRecord } from '../../db/types'
import type { ManualGameData } from '../../components/steps/PlayerDialogs'
import { useToast } from '../../services/toast'
import { useGameHandlers } from './useGameHandlers'
import { useBggUserHandlers, type PendingDuplicateUser } from './useBggUserHandlers'

export type { PendingDuplicateUser }

export interface UsePlayersStepHandlersProps {
  users: UserRecord[]
  games: GameRecord[]
  gameOwners: Record<number, string[]>
  existingLocalUsers: UserRecord[]
  onSetExistingLocalUsers: React.Dispatch<React.SetStateAction<UserRecord[]>>
  onAddBggUser: (username: string) => Promise<void>
  onAddLocalUser: (name: string, isOrganizer?: boolean, options?: { forceNew?: boolean }) => Promise<void>
  onAddGameToUser: (username: string, bggId: number) => Promise<void>
  onAddGameToSession: (bggId: number) => void
  onRemoveGameFromSession: (bggId: number) => void
  onFetchGameInfo: (url: string) => Promise<Partial<ManualGameData> & { bggId: number }>
  onAddGameManually: (usernames: string[], game: ManualGameData) => Promise<void>
  onSearchGame: (query: string) => Promise<Array<{ bggId: number; name: string; yearPublished?: number }>>
}

export function usePlayersStepHandlers(props: UsePlayersStepHandlersProps) {
  const {
    users, games, gameOwners, existingLocalUsers, onSetExistingLocalUsers,
    onAddBggUser, onAddLocalUser, onAddGameToUser, onAddGameToSession, onRemoveGameFromSession,
    onFetchGameInfo, onAddGameManually, onSearchGame,
  } = props

  const toast = useToast()

  // State
  const [pendingBggMapping, setPendingBggMapping] = useState<string | null>(null)
  const [pendingDuplicateUser, setPendingDuplicateUser] = useState<PendingDuplicateUser | null>(null)
  const [selectedLocalUsers, setSelectedLocalUsers] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ bggId: number; name: string; yearPublished?: number }>>([])
  const [isSearching, setIsSearching] = useState(false)
  const [gameUrlInput, setGameUrlInput] = useState('')
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualDialogMode, setManualDialogMode] = useState<'bgg' | 'manual'>('bgg')
  const [isFetchingGame, setIsFetchingGame] = useState(false)
  const [manualGame, setManualGame] = useState<ManualGameData>({ name: '', bggId: 0 })
  const [addingGameId, setAddingGameId] = useState<number | null>(null)
  const [excludedUserGames, setExcludedUserGames] = useState<Set<string>>(new Set())

  // BGG User Handlers
  const bggHandlers = useBggUserHandlers({
    users, existingLocalUsers, onSetExistingLocalUsers,
    onAddBggUser, onAddLocalUser, onAddGameToSession,
    setPendingBggMapping, setPendingDuplicateUser, setSelectedLocalUsers,
  })

  // Game Handlers
  const gameHandlers = useGameHandlers({
    games, gameOwners, selectedLocalUsers, searchResults, gameUrlInput, manualGame,
    onAddGameToUser, onFetchGameInfo, onAddGameManually, onSearchGame,
    setGameUrlInput, setSearchResults, setManualGame, setShowManualEntry,
    setManualDialogMode, setIsFetchingGame, setIsSearching, setAddingGameId,
  })

  // Session Game Handlers
  const handleAddUserGamesToSession = useCallback((username: string) => {
    const userGames = Object.entries(gameOwners)
      .filter(([, owners]) => owners.includes(username))
      .map(([bggId]) => Number(bggId))
    for (const bggId of userGames) {
      onAddGameToSession(bggId)
    }
    setExcludedUserGames((prev) => {
      const next = new Set(prev)
      next.delete(username)
      return next
    })
    const user = users.find((u) => u.username === username)
    toast.success(`Added ${userGames.length} games from ${user?.displayName || username} to session`)
  }, [gameOwners, onAddGameToSession, users, toast])

  const handleRemoveUserGamesFromSession = useCallback((username: string) => {
    const userGameEntries = Object.entries(gameOwners)
      .filter(([, owners]) => owners.includes(username))
    let removedCount = 0
    for (const [bggId, owners] of userGameEntries) {
      const otherSessionOwners = owners.filter(
        (owner) => owner !== username && users.some((u) => u.username === owner)
      )
      if (otherSessionOwners.length === 0) {
        onRemoveGameFromSession(Number(bggId))
        removedCount++
      }
    }
    setExcludedUserGames((prev) => new Set(prev).add(username))
    const user = users.find((u) => u.username === username)
    const sharedCount = userGameEntries.length - removedCount
    if (sharedCount > 0) {
      toast.info(`Removed ${removedCount} exclusive games from ${user?.displayName || username}. ${sharedCount} shared games kept.`)
    } else {
      toast.info(`Removed ${removedCount} games from ${user?.displayName || username} from session`)
    }
  }, [gameOwners, onRemoveGameFromSession, users, toast])

  const toggleUserSelection = useCallback((username: string) => {
    setSelectedLocalUsers((prev) =>
      prev.includes(username) ? prev.filter((u) => u !== username) : [...prev, username]
    )
  }, [])

  // Wrap handlers to pass current state
  const handleLinkBggToExisting = useCallback(
    (user: UserRecord) => bggHandlers.handleLinkBggToExisting(user, pendingBggMapping),
    [bggHandlers, pendingBggMapping]
  )

  const handleCreateBggUser = useCallback(
    (displayName: string) => bggHandlers.handleCreateBggUser(displayName, pendingBggMapping),
    [bggHandlers, pendingBggMapping]
  )

  const handleCreateNewDuplicateUser = useCallback(
    () => bggHandlers.handleCreateNewDuplicateUser(pendingDuplicateUser),
    [bggHandlers, pendingDuplicateUser]
  )

  const handleSearch = useCallback(
    () => gameHandlers.handleSearch(searchQuery),
    [gameHandlers, searchQuery]
  )

  return {
    // BGG mapping state
    pendingBggMapping,
    setPendingBggMapping,
    handleLinkBggToExisting,
    handleCreateBggUser,
    handleCancelBggMapping: bggHandlers.handleCancelBggMapping,
    // Duplicate user state
    pendingDuplicateUser,
    handleAddUser: bggHandlers.handleAddUser,
    handleSelectExistingUser: bggHandlers.handleSelectExistingUser,
    handleCreateNewDuplicateUser,
    handleCancelDuplicateUser: bggHandlers.handleCancelDuplicateUser,
    // Selection state
    selectedLocalUsers,
    setSelectedLocalUsers,
    toggleUserSelection,
    // Search state
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    isSearching,
    handleSearch,
    // Game URL state
    gameUrlInput,
    setGameUrlInput,
    handleAddGameFromUrl: gameHandlers.handleAddGameFromUrl,
    // Manual entry state
    showManualEntry,
    setShowManualEntry,
    manualDialogMode,
    isFetchingGame,
    setIsFetchingGame,
    manualGame,
    setManualGame,
    openManualAddDialog: gameHandlers.openManualAddDialog,
    handleManualGameSubmit: gameHandlers.handleManualGameSubmit,
    // Add game state
    addingGameId,
    handleAddGame: gameHandlers.handleAddGame,
    // Session games
    excludedUserGames,
    handleAddUserGamesToSession,
    handleRemoveUserGamesFromSession,
  }
}
