import { useState, useMemo } from 'react'
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
import { PlayersStepDialogs } from './players/PlayersStepDialogs'
import { PlayersAddUserControls, type UserMode } from './players/PlayersAddUserControls.tsx'
import { BggUserMappingDialog } from './players/BggUserMappingDialog'
import { useToast } from '../../services/toast'
import type { LayoutMode } from '../../services/storage/uiPreferences'
import { findUsersWithSameName, extractSuffixFromId } from '../../services/db/userIdService'
import { usePlayersStepHandlers } from '../../hooks/wizard/usePlayersStepHandlers'

export type { ManualGameData }

export interface PlayersStepProps {
  users: UserRecord[]
  games: GameRecord[]
  sessionGames: GameRecord[]
  gameOwners: Record<number, string[]>
  layoutMode: LayoutMode
  onLayoutModeChange: (mode: LayoutMode) => void
  existingLocalUsers: UserRecord[]
  onSetExistingLocalUsers: React.Dispatch<React.SetStateAction<UserRecord[]>>
  savedNights: SavedNightRecord[]
  pendingBggUserNotFoundUsername: string | null
  onConfirmAddBggUserAnyway: () => Promise<void>
  onCancelAddBggUserAnyway: () => void
  onAddBggUser: (username: string) => Promise<void>
  onAddLocalUser: (name: string, isOrganizer?: boolean, options?: { forceNew?: boolean }) => Promise<void>
  onRemoveUser: (username: string) => void
  onDeleteUser: (username: string) => Promise<void>
  onSetOrganizer: (username: string) => Promise<void>
  onSearchGame: (query: string) => Promise<Array<{ bggId: number; name: string; yearPublished?: number }>>
  onAddGameToUser: (username: string, bggId: number) => Promise<void>
  onRemoveGameFromUser: (username: string, bggId: number) => Promise<void>
  onAddGameToSession: (bggId: number) => void
  onRemoveGameFromSession: (bggId: number) => void
  onAddOwnerToGame: (username: string, bggId: number) => Promise<void>
  onLoadSavedNight: (id: number, options?: { includeGames?: boolean }) => Promise<void>
  onFetchGameInfo: (url: string) => Promise<Partial<ManualGameData> & { bggId: number }>
  onAddGameManually: (usernames: string[], game: ManualGameData) => Promise<void>
  onEditGame: (game: GameRecord) => Promise<void>
  onRefreshGameFromBgg: (bggId: number, options: { keepNotes: boolean }) => Promise<GameRecord>
  isLoading: boolean
}

export function PlayersStep({
  users, games, sessionGames, gameOwners, existingLocalUsers, onSetExistingLocalUsers, savedNights,
  layoutMode, onLayoutModeChange,
  pendingBggUserNotFoundUsername, onConfirmAddBggUserAnyway, onCancelAddBggUserAnyway,
  onAddBggUser, onAddLocalUser, onRemoveUser, onDeleteUser, onSetOrganizer, onSearchGame,
  onAddGameToUser, onRemoveGameFromUser, onAddGameToSession, onRemoveGameFromSession,
  onAddOwnerToGame, onLoadSavedNight, onFetchGameInfo, onAddGameManually, onEditGame,
  onRefreshGameFromBgg, isLoading,
}: PlayersStepProps) {
  const toast = useToast()
  const [mode, setMode] = useState<UserMode>('local')
  const [inputValue, setInputValue] = useState('')
  const [deleteDialogUser, setDeleteDialogUser] = useState<string | null>(null)
  const [showAddGamesPanel, setShowAddGamesPanel] = useState(false)

  const handlers = usePlayersStepHandlers({
    users, games, gameOwners, existingLocalUsers, onSetExistingLocalUsers,
    onAddBggUser, onAddLocalUser, onAddGameToUser, onAddGameToSession, onRemoveGameFromSession,
    onFetchGameInfo, onAddGameManually, onSearchGame,
  })

  const sortedUsers = useMemo(() => [...users].sort((a, b) => (
    a.isOrganizer && !b.isOrganizer ? -1 : b.isOrganizer && !a.isOrganizer ? 1 : 0
  )), [users])

  const autocompleteOptions = useMemo(() => {
    return existingLocalUsers.map(u => {
      const baseName = u.displayName || u.username
      const duplicates = findUsersWithSameName(baseName, existingLocalUsers)
      const suffixRaw = u.internalId ? extractSuffixFromId(u.internalId) : ''
      const suffix = duplicates.length > 1 && suffixRaw ? `#${suffixRaw}` : undefined
      return { label: baseName, username: u.username, internalId: u.internalId, suffix }
    })
  }, [existingLocalUsers])

  const handleAddUser = async () => {
    if (!inputValue.trim()) return
    const cleared = await handlers.handleAddUser(mode, inputValue.trim())
    if (cleared) setInputValue('')
  }

  return (
    <Stack spacing={3}>
      <PlayersStepDialogs
        pendingBggUserNotFoundUsername={pendingBggUserNotFoundUsername}
        onConfirmAddBggUserAnyway={() => void onConfirmAddBggUserAnyway()}
        onCancelAddBggUserAnyway={onCancelAddBggUserAnyway}
        pendingDuplicateUser={handlers.pendingDuplicateUser}
        onSelectExistingUser={(user) => void handlers.handleSelectExistingUser(user)}
        onCreateNewDuplicateUser={() => void handlers.handleCreateNewDuplicateUser()}
        onCancelDuplicateUser={handlers.handleCancelDuplicateUser}
        isLoading={isLoading}
      />

      <BggUserMappingDialog
        open={handlers.pendingBggMapping !== null}
        bggUsername={handlers.pendingBggMapping ?? ''}
        existingLocalUsers={existingLocalUsers}
        isLoading={isLoading}
        onCancel={handlers.handleCancelBggMapping}
        onLinkToExisting={handlers.handleLinkBggToExisting}
        onCreateNew={handlers.handleCreateBggUser}
      />

      <Box>
        <Typography variant="h5" gutterBottom sx={{ color: 'primary.dark' }}>
          Who's playing tonight?
        </Typography>
        <Typography color="text.secondary">
          {savedNights.length > 0
            ? 'Start from a previous game night, or add players to begin'
            : 'Add players by their BoardGameGeek username or create local profiles'}
        </Typography>
      </Box>

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

      <Collapse in={isLoading}>
        <Card sx={{ bgcolor: 'secondary.light', border: 'none' }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={24} />
            <Box>
              <Typography fontWeight={500}>BGG is preparing data…</Typography>
              <Typography variant="body2" color="text.secondary">
                This may take a moment for large collections
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Collapse>

      <DeleteUserDialog
        open={!!deleteDialogUser}
        username={deleteDialogUser}
        onClose={() => setDeleteDialogUser(null)}
        onRemoveFromSession={() => {
          if (deleteDialogUser) {
            onRemoveUser(deleteDialogUser)
            handlers.setSelectedLocalUsers((prev) => prev.filter((u) => u !== deleteDialogUser))
          }
          setDeleteDialogUser(null)
        }}
        onDeletePermanently={async () => {
          if (deleteDialogUser) {
            await onDeleteUser(deleteDialogUser)
            handlers.setSelectedLocalUsers((prev) => prev.filter((u) => u !== deleteDialogUser))
          }
          setDeleteDialogUser(null)
        }}
      />

      <ManualGameDialog
        open={handlers.showManualEntry}
        mode={handlers.manualDialogMode}
        game={handlers.manualGame}
        isLoading={handlers.isFetchingGame}
        onGameChange={handlers.setManualGame}
        onClose={() => { handlers.setShowManualEntry(false); handlers.setIsFetchingGame(false) }}
        onSubmit={handlers.handleManualGameSubmit}
      />

      {users.length > 0 && (
        <PlayersListCard
          users={sortedUsers}
          gameOwners={gameOwners}
          excludedUserGames={handlers.excludedUserGames}
          onSetOrganizer={onSetOrganizer}
          onRequestDelete={(username) => setDeleteDialogUser(username)}
          onAddUserGamesToSession={handlers.handleAddUserGamesToSession}
          onRemoveUserGamesFromSession={handlers.handleRemoveUserGamesFromSession}
        />
      )}

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
          toast.info(`Removed "${game.name}" from this session`, {
            autoHideMs: 5500,
            actionLabel: 'Undo',
            onAction: () => onAddGameToSession(game.bggId),
          })
        }}
        onEditGame={onEditGame}
        onRefreshGameFromBgg={onRefreshGameFromBgg}
        showAddNewGamesAction={users.length > 0}
        addNewGamesPanelOpen={showAddGamesPanel}
        onToggleAddNewGamesPanel={() => {
          setShowAddGamesPanel((v) => {
            if (!v && handlers.selectedLocalUsers.length === 0 && users.length > 0) {
              const organizer = users.find((u) => u.isOrganizer)
              handlers.setSelectedLocalUsers([organizer?.username ?? users[0].username])
            }
            return !v
          })
        }}
        addNewGamesPanel={(
          <LocalAddGamesPanel
            open={users.length > 0 && showAddGamesPanel}
            localUsers={users}
            selectedLocalUsers={handlers.selectedLocalUsers}
            onToggleUser={handlers.toggleUserSelection}
            onSelectAll={() => handlers.setSelectedLocalUsers(users.map((u) => u.username))}
            gameUrlInput={handlers.gameUrlInput}
            onGameUrlInputChange={handlers.setGameUrlInput}
            onAddGameFromUrl={handlers.handleAddGameFromUrl}
            onOpenManualGameDialog={handlers.openManualAddDialog}
            isLoading={isLoading}
            searchQuery={handlers.searchQuery}
            onSearchQueryChange={handlers.setSearchQuery}
            onSearch={handlers.handleSearch}
            isSearching={handlers.isSearching}
            searchResults={handlers.searchResults}
            onAddGame={handlers.handleAddGame}
            addingGameId={handlers.addingGameId}
          />
        )}
      />
    </Stack>
  )
}
