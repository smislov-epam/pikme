import { useState, useCallback, useMemo } from 'react'
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Collapse,
  Stack,
  Typography,
} from '@mui/material'
import type { GameRecord, UserRecord, SavedNightRecord } from '../../db/types'
import { DeleteUserDialog, ManualGameDialog, type ManualGameData } from './PlayerDialogs'
import { GamePreviewGrid } from './GamePreviewGrid'
import { PlayersListCard } from './PlayersListCard'
import { LocalAddGamesPanel } from './players/LocalAddGamesPanel'
import { SavedNightPicker } from './players/SavedNightPicker'
import { PlayersStepDialogs, type PendingDuplicateUser } from './players/PlayersStepDialogs'
import { PlayersAddUserControls, type UserMode } from './players/PlayersAddUserControls.tsx'
import { normalizePlayTime } from '../../services/bgg/normalizePlayTime'
import { useToast } from '../../services/toast'
import type { LayoutMode } from '../../services/storage/uiPreferences'
import { findUsersWithSameName, extractSuffixFromId } from '../../services/db/userIdService'

export type { ManualGameData }

export interface PlayersStepProps {
  users: UserRecord[]
  games: GameRecord[]
  sessionGames: GameRecord[]
  gameOwners: Record<number, string[]>
  layoutMode: LayoutMode
  onLayoutModeChange: (mode: LayoutMode) => void
  existingLocalUsers: UserRecord[]  // All local users from DB for autocomplete
  savedNights: SavedNightRecord[]
  pendingBggUserNotFoundUsername: string | null
  onConfirmAddBggUserAnyway: () => Promise<void>
  onCancelAddBggUserAnyway: () => void
  pendingReuseGamesNight: { id: number; name: string; gameCount: number } | null
  onConfirmReuseGamesFromNight: () => Promise<void>
  onDismissReuseGamesPrompt: () => void
  onAddBggUser: (username: string) => Promise<void>
  onAddLocalUser: (name: string, isOrganizer?: boolean) => Promise<void>
  onRemoveUser: (username: string) => void
  onDeleteUser: (username: string) => Promise<void>
  onSetOrganizer: (username: string) => Promise<void>
  onSearchGame: (query: string) => Promise<Array<{ bggId: number; name: string; yearPublished?: number }>>
  onAddGameToUser: (username: string, bggId: number) => Promise<void>
  onRemoveGameFromUser: (username: string, bggId: number) => Promise<void>
  onAddGameToSession: (bggId: number) => void
  onRemoveGameFromSession: (bggId: number) => void
  onExcludeGameFromSession: (bggId: number) => void
  onUndoExcludeGameFromSession: (bggId: number) => void
  onAddOwnerToGame: (username: string, bggId: number) => Promise<void>
  onLoadSavedNight: (id: number) => Promise<void>
  onFetchGameInfo: (url: string) => Promise<Partial<ManualGameData> & { bggId: number }>
  onAddGameManually: (usernames: string[], game: ManualGameData) => Promise<void>
  onEditGame: (game: GameRecord) => Promise<void>
  onRefreshGameFromBgg: (bggId: number, options: { keepNotes: boolean }) => Promise<GameRecord>
  isLoading: boolean
  error: string | null
}

export function PlayersStep({
  users, games, sessionGames, gameOwners, existingLocalUsers, savedNights,
  layoutMode,
  onLayoutModeChange,
  pendingBggUserNotFoundUsername,
  onConfirmAddBggUserAnyway,
  onCancelAddBggUserAnyway,
  pendingReuseGamesNight,
  onConfirmReuseGamesFromNight,
  onDismissReuseGamesPrompt,
  onAddBggUser, onAddLocalUser, onRemoveUser, onDeleteUser, onSetOrganizer, onSearchGame,
  onAddGameToUser, onRemoveGameFromUser, onAddGameToSession, onRemoveGameFromSession,
  onAddOwnerToGame, onLoadSavedNight, onFetchGameInfo, onAddGameManually, onEditGame,
  onRefreshGameFromBgg,
  isLoading,
}: PlayersStepProps) {
  const toast = useToast()
  const [mode, setMode] = useState<UserMode>('local')
  const [inputValue, setInputValue] = useState('')
  const [selectedLocalUsers, setSelectedLocalUsers] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [gameUrlInput, setGameUrlInput] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ bggId: number; name: string; yearPublished?: number }>>([])
  const [isSearching, setIsSearching] = useState(false)
  const [deleteDialogUser, setDeleteDialogUser] = useState<string | null>(null)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [showAddGamesPanel, setShowAddGamesPanel] = useState(false)
  const [isFetchingGame, setIsFetchingGame] = useState(false)
  const [manualGame, setManualGame] = useState<ManualGameData>({ name: '', bggId: 0 })
  const [pendingDuplicateUser, setPendingDuplicateUser] = useState<PendingDuplicateUser | null>(null)

  const showNotice = useCallback((message: string, severity: 'success' | 'info' | 'warning' = 'info') => {
    if (severity === 'success') toast.success(message)
    else if (severity === 'warning') toast.warning(message)
    else toast.info(message)
  }, [toast])

  const localUsers = users.filter((u) => !u.isBggUser)
  const sortedUsers = useMemo(() => [...users].sort((a, b) => (a.isOrganizer && !b.isOrganizer ? -1 : b.isOrganizer && !a.isOrganizer ? 1 : 0)), [users])
  // Autocomplete options: existing local users not already in session (as objects for proper mapping)
  // Include disambiguation suffix for users with duplicate names
  const autocompleteOptions = useMemo(() => {
    const sessionUsernames = new Set(users.map(u => u.username))
    const availableUsers = existingLocalUsers.filter(u => !sessionUsernames.has(u.username))
    
    return availableUsers.map(u => {
      const baseName = u.displayName || u.username
      const duplicates = findUsersWithSameName(baseName, availableUsers)
      
      // Add suffix for disambiguation if there are duplicates
      let label = baseName
      if (duplicates.length > 1 && u.internalId) {
        const suffix = extractSuffixFromId(u.internalId)
        if (suffix) {
          label = `${baseName} (#${suffix})`
        }
      }
      
      return { label, username: u.username, internalId: u.internalId }
    })
  }, [existingLocalUsers, users])

  const handleAddUser = async () => {
    if (!inputValue.trim()) return
    if (mode === 'bgg') {
      await onAddBggUser(inputValue.trim())
    } else {
      const trimmedName = inputValue.trim()
      
      // Check for existing users with the same name (not already in session)
      const sessionUsernames = new Set(users.map(u => u.username))
      const duplicates = findUsersWithSameName(trimmedName, existingLocalUsers)
        .filter(u => !sessionUsernames.has(u.username))
      
      if (duplicates.length > 0) {
        // Show confirmation dialog
        setPendingDuplicateUser({ name: trimmedName, existingUsers: duplicates })
        return
      }
      
      // No duplicates - proceed to add new user
      const isOrganizer = users.length === 0
      await onAddLocalUser(trimmedName, isOrganizer)
    }
    setInputValue('')
  }

  const handleSelectExistingUser = async (user: UserRecord) => {
    const isOrganizer = users.length === 0
    await onAddLocalUser(user.username, isOrganizer)
    setSelectedLocalUsers((prev) => [...prev, user.username])
    setPendingDuplicateUser(null)
    setInputValue('')
  }

  const handleCreateNewDuplicateUser = async () => {
    if (!pendingDuplicateUser) return
    const isOrganizer = users.length === 0
    // Create a new user with the same display name (will get unique username based on internalId)
    await onAddLocalUser(pendingDuplicateUser.name, isOrganizer)
    setPendingDuplicateUser(null)
    setInputValue('')
  }

  const handleCancelDuplicateUser = () => {
    setPendingDuplicateUser(null)
  }

  const toggleUserSelection = (username: string) => setSelectedLocalUsers((prev) => prev.includes(username) ? prev.filter((u) => u !== username) : [...prev, username])
  const selectAllLocalUsers = () => setSelectedLocalUsers(localUsers.map((u) => u.username))

  const handleAddGameFromUrl = async () => {
    if (!gameUrlInput.trim() || selectedLocalUsers.length === 0) return
    const match = gameUrlInput.match(/boardgamegeek\.com\/boardgame\/(\d+)/i)
    if (!match) return

    const bggId = parseInt(match[1], 10)

    // Simple duplicate validator:
    // If the game is already in our local DB, avoid re-fetching and avoid opening the manual dialog.
    // Instead, either add the existing game to missing selected users, or just notify it's already added.
    const existingGame = games.find((g) => g.bggId === bggId)
    if (existingGame) {
      const owners = new Set(gameOwners[bggId] ?? [])
      const missingUsers = selectedLocalUsers.filter((u) => !owners.has(u))

      if (missingUsers.length === 0) {
        showNotice(`“${existingGame.name}” is already added for the selected players.`, 'info')
        return
      }

      for (const username of missingUsers) {
        await onAddGameToUser(username, bggId)
      }

      showNotice(`Added existing game “${existingGame.name}” to: ${missingUsers.join(', ')}`, 'success')
      setGameUrlInput('')
      return
    }

    // Always show dialog - fetch what we can and let user complete
    setIsFetchingGame(true)
    setShowManualEntry(true)
    setManualGame({ name: '', bggId })

    try {
      const gameInfo = await onFetchGameInfo(gameUrlInput.trim())

      // The dialog edits min/max playtime, but extraction may only provide an average playingTimeMinutes.
      // Populate min/max from average when missing so fields show up for the user.
      const normalizedTime = normalizePlayTime({ playingTimeMinutes: gameInfo.playingTimeMinutes, minPlayTimeMinutes: gameInfo.minPlayTimeMinutes, maxPlayTimeMinutes: gameInfo.maxPlayTimeMinutes })

      setManualGame({
        bggId: gameInfo.bggId,
        name: gameInfo.name || '',
        thumbnail: gameInfo.thumbnail,
        minPlayers: gameInfo.minPlayers, maxPlayers: gameInfo.maxPlayers, bestWith: gameInfo.bestWith,
        playingTimeMinutes: normalizedTime.playingTimeMinutes,
        minPlayTimeMinutes: normalizedTime.minPlayTimeMinutes, maxPlayTimeMinutes: normalizedTime.maxPlayTimeMinutes,
        minAge: gameInfo.minAge, averageRating: gameInfo.averageRating, weight: gameInfo.weight,
        categories: gameInfo.categories, mechanics: gameInfo.mechanics,
        description: gameInfo.description,
      })
    } catch {
      // Keep dialog open with just the ID
    } finally {
      setIsFetchingGame(false)
    }
  }

  const handleManualGameSubmit = async () => {
    if (!manualGame.name.trim() || manualGame.bggId <= 0 || selectedLocalUsers.length === 0) return
    await onAddGameManually(selectedLocalUsers, manualGame)
    setShowManualEntry(false)
    setGameUrlInput('')
    setManualGame({ name: '', bggId: 0 })
  }

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    try { const results = await onSearchGame(searchQuery.trim()); setSearchResults(results.slice(0, 10)) }
    finally { setIsSearching(false) }
  }, [searchQuery, onSearchGame])

  const handleAddGame = async (bggId: number) => {
    if (selectedLocalUsers.length === 0) return
    for (const username of selectedLocalUsers) await onAddGameToUser(username, bggId)
    setSearchResults((prev) => prev.filter((r) => r.bggId !== bggId))
  }

  return (
    <Stack spacing={3}>
      <PlayersStepDialogs
        pendingBggUserNotFoundUsername={pendingBggUserNotFoundUsername}
        onConfirmAddBggUserAnyway={() => void onConfirmAddBggUserAnyway()}
        onCancelAddBggUserAnyway={onCancelAddBggUserAnyway}
        pendingReuseGamesNight={pendingReuseGamesNight}
        onConfirmReuseGamesFromNight={() => void onConfirmReuseGamesFromNight()}
        onDismissReuseGamesPrompt={onDismissReuseGamesPrompt}
        pendingDuplicateUser={pendingDuplicateUser}
        onSelectExistingUser={(user) => void handleSelectExistingUser(user)}
        onCreateNewDuplicateUser={() => void handleCreateNewDuplicateUser()}
        onCancelDuplicateUser={handleCancelDuplicateUser}
        isLoading={isLoading}
      />

      <Box>
        <Typography variant="h5" gutterBottom sx={{ color: 'primary.dark' }}>Who's playing tonight?</Typography>
        <Typography color="text.secondary">
          {savedNights.length > 0
            ? 'Start from a previous game night, or add players to begin'
            : 'Add players by their BoardGameGeek username or create local profiles'}
        </Typography>
      </Box>

      {/* Errors are surfaced via global toast in WizardPage; keep step UI clean. */}

      {/* Load previous night */}
      <SavedNightPicker
        savedNights={savedNights}
        onLoadSavedNight={onLoadSavedNight}
        onAfterLoad={() => setShowAddGamesPanel(false)}
      />

      <PlayersAddUserControls
        mode={mode}
        onModeChange={setMode}
        inputValue={inputValue}
        onInputValueChange={setInputValue}
        autocompleteOptions={autocompleteOptions}
        isLoading={isLoading}
        onAdd={() => void handleAddUser()}
      />


      <Collapse in={isLoading}><Card sx={{ bgcolor: 'secondary.light', border: 'none' }}><CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}><CircularProgress size={24} /><Box><Typography fontWeight={500}>BGG is preparing data…</Typography><Typography variant="body2" color="text.secondary">This may take a moment for large collections</Typography></Box></CardContent></Card></Collapse>

      <DeleteUserDialog open={!!deleteDialogUser} username={deleteDialogUser} onClose={() => setDeleteDialogUser(null)} onRemoveFromSession={() => { if (deleteDialogUser) { onRemoveUser(deleteDialogUser); setSelectedLocalUsers((prev) => prev.filter((u) => u !== deleteDialogUser)) } setDeleteDialogUser(null) }} onDeletePermanently={async () => { if (deleteDialogUser) { await onDeleteUser(deleteDialogUser); setSelectedLocalUsers((prev) => prev.filter((u) => u !== deleteDialogUser)) } setDeleteDialogUser(null) }} />
      <ManualGameDialog open={showManualEntry} game={manualGame} isLoading={isFetchingGame} onGameChange={setManualGame} onClose={() => { setShowManualEntry(false); setIsFetchingGame(false) }} onSubmit={handleManualGameSubmit} />

      {users.length > 0 ? (
        <PlayersListCard
          users={sortedUsers}
          gameOwners={gameOwners}
          onSetOrganizer={onSetOrganizer}
          onRequestDelete={(username) => setDeleteDialogUser(username)}
        />
      ) : null}

      <GamePreviewGrid
        games={games}
        sessionGames={sessionGames}
        gameOwners={gameOwners}
        totalGames={games.length}
        users={users}
        layoutMode={layoutMode}
        onLayoutModeChange={onLayoutModeChange}
        onRemoveOwner={onRemoveGameFromUser}
        onAddOwner={onAddOwnerToGame}
        onAddToSession={onAddGameToSession}
        onExcludeFromSession={(game) => {
          onRemoveGameFromSession(game.bggId)
          toast.info(`Removed “${game.name}” from this session`, {
            autoHideMs: 5500,
            actionLabel: 'Undo',
            onAction: () => onAddGameToSession(game.bggId),
          })
        }}
        onEditGame={onEditGame}
        onRefreshGameFromBgg={onRefreshGameFromBgg}

        showAddNewGamesAction={localUsers.length > 0}
        addNewGamesPanelOpen={showAddGamesPanel}
        onToggleAddNewGamesPanel={() => setShowAddGamesPanel((v) => !v)}
      />

      <LocalAddGamesPanel
        open={localUsers.length > 0 && showAddGamesPanel}
        localUsers={localUsers}
        selectedLocalUsers={selectedLocalUsers}
        onToggleUser={toggleUserSelection}
        onSelectAll={selectAllLocalUsers}
        gameUrlInput={gameUrlInput}
        onGameUrlInputChange={setGameUrlInput}
        onAddGameFromUrl={handleAddGameFromUrl}
        isLoading={isLoading}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSearch={handleSearch}
        isSearching={isSearching}
        searchResults={searchResults}
        onAddGame={handleAddGame}
        onClose={() => setShowAddGamesPanel(false)}
      />
    </Stack>
  )
}
