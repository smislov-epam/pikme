import { useState, useCallback, useMemo } from 'react'
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Collapse,
  InputAdornment,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import HistoryIcon from '@mui/icons-material/History'
import PersonIcon from '@mui/icons-material/Person'
import RefreshIcon from '@mui/icons-material/Refresh'
import type { GameRecord, UserRecord, SavedNightRecord } from '../../db/types'
import { DeleteUserDialog, ManualGameDialog, type ManualGameData } from './PlayerDialogs'
import { GamePreviewGrid } from './GamePreviewGrid'
import { PlayersListCard } from './PlayersListCard'
import { LocalPlayersGamesCard } from './LocalPlayersGamesCard'
import { normalizePlayTime } from '../../services/bgg/normalizePlayTime'
import { useToast } from '../../services/toast'

export type { ManualGameData }

export interface PlayersStepProps {
  users: UserRecord[]
  games: GameRecord[]
  sessionGames: GameRecord[]
  gameOwners: Record<number, string[]>
  existingLocalUsers: UserRecord[]  // All local users from DB for autocomplete
  savedNights: SavedNightRecord[]
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

type UserMode = 'bgg' | 'local'

export function PlayersStep({
  users, games, sessionGames, gameOwners, existingLocalUsers, savedNights,
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
  const [isFetchingGame, setIsFetchingGame] = useState(false)
  const [manualGame, setManualGame] = useState<ManualGameData>({ name: '', bggId: 0 })

  const showNotice = useCallback((message: string, severity: 'success' | 'info' | 'warning' = 'info') => {
    if (severity === 'success') toast.success(message)
    else if (severity === 'warning') toast.warning(message)
    else toast.info(message)
  }, [toast])

  const localUsers = users.filter((u) => !u.isBggUser)
  const sortedUsers = useMemo(() => [...users].sort((a, b) => (a.isOrganizer && !b.isOrganizer ? -1 : b.isOrganizer && !a.isOrganizer ? 1 : 0)), [users])
  // Autocomplete options: existing local users not already in session (as objects for proper mapping)
  const autocompleteOptions = useMemo(() => {
    const sessionUsernames = new Set(users.map(u => u.username))
    return existingLocalUsers
      .filter(u => !sessionUsernames.has(u.username))
      .map(u => ({ label: u.displayName || u.username, username: u.username }))
  }, [existingLocalUsers, users])

  const handleAddUser = async () => {
    if (!inputValue.trim()) return
    if (mode === 'bgg') await onAddBggUser(inputValue.trim())
    else {
      const isOrganizer = users.length === 0
      await onAddLocalUser(inputValue.trim(), isOrganizer)
      setSelectedLocalUsers((prev) => [...prev, inputValue.trim()])
    }
    setInputValue('')
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

  // Format saved night for display
  const savedNightOptions = useMemo(() => savedNights.map((night) => ({
    id: night.id!,
    label: night.data.name,
    description: night.data.description,
    date: new Date(night.createdAt).toLocaleDateString(),
    playerCount: night.data.usernames.length,
    gameCount: night.data.gameIds?.length ?? 0,
  })), [savedNights])

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" gutterBottom sx={{ color: 'primary.dark' }}>Who's playing tonight?</Typography>
        <Typography color="text.secondary">Add players by their BoardGameGeek username or create local profiles</Typography>
      </Box>

      {/* Errors are surfaced via global toast in WizardPage; keep step UI clean. */}

      {/* Load previous night */}
      {savedNightOptions.length > 0 && (
        <Autocomplete
          options={savedNightOptions}
          getOptionLabel={(opt) => `${opt.label} (${opt.date})`}
          onChange={(_, opt) => { if (opt) onLoadSavedNight(opt.id) }}
          renderOption={(props, opt) => (
            <Box component="li" {...props} key={opt.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <HistoryIcon fontSize="small" color="action" />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={500}>{opt.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {opt.date} • {opt.playerCount} players • {opt.gameCount} games
                    {opt.description && ` • ${opt.description.slice(0, 40)}${opt.description.length > 40 ? '...' : ''}`}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Load a previous game night..."
              size="small"
              InputProps={{ ...params.InputProps, startAdornment: <HistoryIcon fontSize="small" color="action" sx={{ ml: 1, mr: 0.5 }} /> }}
            />
          )}
        />
      )}

      <ToggleButtonGroup value={mode} exclusive onChange={(_, v) => v && setMode(v)} fullWidth sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
        <ToggleButton value="bgg" sx={{ py: 1, minHeight: 40 }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><RefreshIcon fontSize="small" />BGG Username</Box></ToggleButton>
        <ToggleButton value="local" sx={{ py: 1, minHeight: 40 }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><PersonIcon fontSize="small" />Local Player</Box></ToggleButton>
      </ToggleButtonGroup>

      {mode === 'bgg' ? (
        <TextField
          fullWidth
          size="small"
          placeholder="Enter BGG username"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAddUser() }}
          disabled={isLoading}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => handleAddUser()}
                  disabled={!inputValue.trim() || isLoading}
                  startIcon={isLoading ? <CircularProgress size={16} /> : <AddIcon />}
                  sx={{ height: 32 }}
                >
                  Add
                </Button>
              </InputAdornment>
            ),
          }}
        />
      ) : (
        <Autocomplete
          freeSolo
          disableClearable
          options={autocompleteOptions}
          getOptionLabel={(opt) => typeof opt === 'string' ? opt : opt.label}
          inputValue={inputValue}
          onInputChange={(_, v) => setInputValue(v)}
          onChange={(_, v) => {
            if (v && typeof v !== 'string') {
              // Selected an existing user - use their username
              setInputValue(v.username)
            } else if (typeof v === 'string') {
              setInputValue(v)
            }
          }}
          disabled={isLoading}
          renderOption={(props, option) => (
            <Box component="li" {...props} key={option.username}>
              <Stack direction="row" spacing={1} alignItems="center">
                <PersonIcon fontSize="small" color="action" />
                <Typography variant="body2">{option.label}</Typography>
              </Stack>
            </Box>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              fullWidth
              size="small"
              placeholder={autocompleteOptions.length > 0 ? "Enter name or select existing player" : "Enter player name"}
              onKeyDown={(e) => { if (e.key === 'Enter' && inputValue.trim()) { e.preventDefault(); handleAddUser() } }}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <InputAdornment position="end">
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleAddUser()}
                      disabled={!inputValue.trim() || isLoading}
                      startIcon={isLoading ? <CircularProgress size={16} /> : <AddIcon />}
                      sx={{ height: 32 }}
                    >
                      Add
                    </Button>
                  </InputAdornment>
                )
              }}
            />
          )}
        />
      )}


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

      <Collapse in={localUsers.length > 0}>
        <LocalPlayersGamesCard
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
        />
      </Collapse>

      <GamePreviewGrid
        games={games}
        sessionGames={sessionGames}
        gameOwners={gameOwners}
        totalGames={games.length}
        users={users}
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
      />
    </Stack>
  )
}
