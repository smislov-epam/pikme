import { useState, useCallback, useMemo } from 'react'
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import HistoryIcon from '@mui/icons-material/History'
import LinkIcon from '@mui/icons-material/Link'
import PersonIcon from '@mui/icons-material/Person'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'
import StarIcon from '@mui/icons-material/Star'
import type { GameRecord, UserRecord, SavedNightRecord } from '../../db/types'
import { colors } from '../../theme/theme'
import { DeleteUserDialog, ManualGameDialog, type ManualGameData } from './PlayerDialogs'
import { GamePreviewGrid } from './GamePreviewGrid'
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
  onExcludeGameFromSession, onUndoExcludeGameFromSession,
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
      const normalizedTime = normalizePlayTime({
        playingTimeMinutes: gameInfo.playingTimeMinutes,
        minPlayTimeMinutes: gameInfo.minPlayTimeMinutes,
        maxPlayTimeMinutes: gameInfo.maxPlayTimeMinutes,
      })

      setManualGame({
        bggId: gameInfo.bggId,
        name: gameInfo.name || '',
        thumbnail: gameInfo.thumbnail,
        minPlayers: gameInfo.minPlayers,
        maxPlayers: gameInfo.maxPlayers,
        bestWith: gameInfo.bestWith,
        playingTimeMinutes: normalizedTime.playingTimeMinutes,
        minPlayTimeMinutes: normalizedTime.minPlayTimeMinutes,
        maxPlayTimeMinutes: normalizedTime.maxPlayTimeMinutes,
        minAge: gameInfo.minAge,
        averageRating: gameInfo.averageRating,
        weight: gameInfo.weight,
        categories: gameInfo.categories,
        mechanics: gameInfo.mechanics,
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

      <ToggleButtonGroup value={mode} exclusive onChange={(_, v) => v && setMode(v)} fullWidth sx={{ bgcolor: 'background.paper', borderRadius: 3 }}>
        <ToggleButton value="bgg" sx={{ py: 1.5 }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><RefreshIcon fontSize="small" />BGG Username</Box></ToggleButton>
        <ToggleButton value="local" sx={{ py: 1.5 }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><PersonIcon fontSize="small" />Local Player</Box></ToggleButton>
      </ToggleButtonGroup>

      {mode === 'bgg' ? (
        <TextField fullWidth placeholder="Enter BGG username" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAddUser() }} disabled={isLoading} InputProps={{ endAdornment: (<InputAdornment position="end"><Button variant="contained" size="small" onClick={() => handleAddUser()} disabled={!inputValue.trim() || isLoading} startIcon={isLoading ? <CircularProgress size={16} /> : <AddIcon />}>Add</Button></InputAdornment>) }} />
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
              placeholder={autocompleteOptions.length > 0 ? "Enter name or select existing player" : "Enter player name"}
              onKeyDown={(e) => { if (e.key === 'Enter' && inputValue.trim()) { e.preventDefault(); handleAddUser() } }}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <InputAdornment position="end">
                    <Button variant="contained" size="small" onClick={() => handleAddUser()} disabled={!inputValue.trim() || isLoading} startIcon={isLoading ? <CircularProgress size={16} /> : <AddIcon />}>Add</Button>
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

      {users.length > 0 && (
        <Card><CardContent>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>Players ({users.length}) {sortedUsers.find(u => u.isOrganizer) && '• Host pinned first'}</Typography>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {sortedUsers.map((user) => {
              const userGameCount = Object.values(gameOwners).filter((owners) => owners.includes(user.username)).length
              return (<Chip key={user.username} label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>{user.isOrganizer && <StarIcon sx={{ fontSize: 16, color: '#B8860B' }} />}{user.displayName || user.username}{user.isOrganizer && <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 600 }}>(Host)</Typography>}{userGameCount > 0 && <Typography variant="caption" sx={{ opacity: 0.7 }}>({userGameCount} games)</Typography>}</Box>} icon={user.isBggUser ? <RefreshIcon /> : <PersonIcon />} onClick={() => !user.isOrganizer && onSetOrganizer(user.username)} onDelete={() => setDeleteDialogUser(user.username)} title={user.isOrganizer ? 'Host - games belong to them' : 'Click to make host'} sx={{ bgcolor: user.isOrganizer ? colors.sand : user.isBggUser ? 'primary.light' : 'secondary.main', color: 'primary.dark', cursor: user.isOrganizer ? 'default' : 'pointer', fontWeight: user.isOrganizer ? 600 : 400, '& .MuiChip-deleteIcon': { color: 'primary.dark', opacity: 0.6, '&:hover': { opacity: 1 } } }} />)
            })}
          </Stack>
        </CardContent></Card>
      )}

      <Collapse in={localUsers.length > 0}>
        <Card sx={{ bgcolor: colors.sand + '20' }}><CardContent>
          <Typography variant="subtitle2" gutterBottom>Add games for local players</Typography>
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" alignItems="center" gap={1} mb={1}><Typography variant="caption" color="text.secondary">Select users to add games to:</Typography>{localUsers.length > 1 && <Button size="small" onClick={selectAllLocalUsers} sx={{ fontSize: '0.7rem', py: 0 }}>Select all</Button>}</Stack>
            <Stack direction="row" flexWrap="wrap" gap={1}>{localUsers.map((user) => (<Chip key={user.username} label={user.displayName || user.username} onClick={() => toggleUserSelection(user.username)} variant={selectedLocalUsers.includes(user.username) ? 'filled' : 'outlined'} color={selectedLocalUsers.includes(user.username) ? 'primary' : 'default'} icon={user.isOrganizer ? <StarIcon sx={{ fontSize: 16 }} /> : undefined} />))}</Stack>
            {selectedLocalUsers.length > 0 && <Typography variant="caption" color="primary" sx={{ mt: 0.5, display: 'block' }}>✓ Games will be added to: {selectedLocalUsers.join(', ')}</Typography>}
          </Box>
          <TextField fullWidth size="small" placeholder="Paste BGG link (e.g. boardgamegeek.com/boardgame/123/game)" value={gameUrlInput} onChange={(e) => setGameUrlInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddGameFromUrl()} InputProps={{ startAdornment: <InputAdornment position="start"><LinkIcon fontSize="small" /></InputAdornment>, endAdornment: <InputAdornment position="end"><Button size="small" onClick={handleAddGameFromUrl} disabled={!gameUrlInput.trim() || selectedLocalUsers.length === 0 || isLoading}>Add</Button></InputAdornment> }} />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', my: 1 }}>— or search (requires API key) —</Typography>
          <TextField fullWidth size="small" placeholder="Search BoardGameGeek..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={handleSearch} disabled={isSearching}>{isSearching ? <CircularProgress size={20} /> : <SearchIcon />}</IconButton></InputAdornment> }} />
          {searchResults.length > 0 && (<Stack spacing={1} sx={{ mt: 2 }}>{searchResults.map((game) => (<Box key={game.bggId} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: 'background.paper', borderRadius: 2 }}><Box><Typography fontWeight={500}>{game.name}</Typography>{game.yearPublished && <Typography variant="caption" color="text.secondary">({game.yearPublished})</Typography>}</Box><Button size="small" variant="outlined" onClick={() => handleAddGame(game.bggId)} disabled={selectedLocalUsers.length === 0}>Add</Button></Box>))}</Stack>)}
        </CardContent></Card>
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
        onRemoveFromSession={onRemoveGameFromSession}
        onExcludeFromSession={(game) => {
          onExcludeGameFromSession(game.bggId)
          toast.info(`Excluded “${game.name}” from this session`, {
            autoHideMs: 5500,
            actionLabel: 'Undo',
            onAction: () => onUndoExcludeGameFromSession(game.bggId),
          })
        }}
        onEditGame={onEditGame}
        onRefreshGameFromBgg={onRefreshGameFromBgg}
      />
    </Stack>
  )
}
