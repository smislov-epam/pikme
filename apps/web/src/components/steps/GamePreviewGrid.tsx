import { useState, useMemo } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Collapse,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd'
import type { GameRecord, UserRecord } from '../../db/types'
import { GameRow } from './GameRow'
import { GameEditDialog } from '../GameEditDialog'
import { GameDetailsDialog } from '../gameDetails/GameDetailsDialog'
import { colors } from '../../theme/theme'
import type { LayoutMode } from '../../services/storage/uiPreferences'
import { LayoutToggle } from '../LayoutToggle'

interface GamePreviewGridProps {
  games: GameRecord[]
  sessionGames: GameRecord[]
  gameOwners: Record<number, string[]>
  totalGames: number
  users: UserRecord[]
  layoutMode?: LayoutMode
  onLayoutModeChange?: (mode: LayoutMode) => void
  onRemoveOwner?: (username: string, bggId: number) => Promise<void>
  onAddOwner?: (username: string, bggId: number) => Promise<void>
  onAddToSession?: (bggId: number) => void
  onExcludeFromSession?: (game: GameRecord) => void
  onEditGame?: (game: GameRecord) => Promise<void>
  onRefreshGameFromBgg?: (bggId: number, options: { keepNotes: boolean }) => Promise<GameRecord>

  showAddNewGamesAction?: boolean
  onToggleAddNewGamesPanel?: () => void
  addNewGamesPanelOpen?: boolean
}

export function GamePreviewGrid({
  games,
  sessionGames,
  gameOwners,
  totalGames,
  users,
  layoutMode = 'standard',
  onLayoutModeChange,
  onRemoveOwner,
  onAddOwner,
  onAddToSession,
  onExcludeFromSession,
  onEditGame,
  onRefreshGameFromBgg,
  showAddNewGamesAction,
  onToggleAddNewGamesPanel,
  addNewGamesPanelOpen,
}: GamePreviewGridProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPlayers, setFilterPlayers] = useState<number | null>(null)
  const [showCollectionGames, setShowCollectionGames] = useState(false)
  const [editingGame, setEditingGame] = useState<GameRecord | null>(null)
  const [detailsGame, setDetailsGame] = useState<GameRecord | null>(null)

  const sessionGameIds = useMemo(() => new Set(sessionGames.map(g => g.bggId)), [sessionGames])
  const collectionOnlyGames = useMemo(() => games.filter(g => !sessionGameIds.has(g.bggId)), [games, sessionGameIds])

  const filteredGames = useMemo(() => {
    let result = sessionGames
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (g) => g.name.toLowerCase().includes(query) ||
          g.categories?.some((c) => c.toLowerCase().includes(query)) ||
          g.mechanics?.some((m) => m.toLowerCase().includes(query))
      )
    }
    if (filterPlayers) {
      result = result.filter((g) => g.minPlayers && g.maxPlayers && filterPlayers >= g.minPlayers && filterPlayers <= g.maxPlayers)
    }
    return result
  }, [sessionGames, searchQuery, filterPlayers])

  if (totalGames === 0 && !showAddNewGamesAction) return null

  const playerCounts = [2, 3, 4, 5, 6]

  return (
    <Card sx={{ bgcolor: 'background.paper' }}>
      <CardContent sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={2} mb={1.5}>
          <Typography variant="h6" fontWeight={600} color="primary.main" sx={{ whiteSpace: 'nowrap' }}>
            {sessionGames.length} in Session
          </Typography>
          <TextField
            size="small"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flex: 1, maxWidth: 200 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" color="action" /></InputAdornment>,
              sx: { height: 32, fontSize: '0.875rem' },
            }}
          />
          <Stack direction="row" spacing={0.5} alignItems="center">
            {playerCounts.map((count) => (
              <IconButton
                key={count}
                size="small"
                onClick={() => setFilterPlayers(filterPlayers === count ? null : count)}
                sx={{
                  width: 24, height: 24, fontSize: '0.7rem',
                  bgcolor: filterPlayers === count ? 'primary.main' : 'action.hover',
                  color: filterPlayers === count ? 'white' : 'text.secondary',
                  '&:hover': { bgcolor: filterPlayers === count ? 'primary.dark' : 'action.selected' },
                }}
              >
                {count}
              </IconButton>
            ))}
          </Stack>

          {onLayoutModeChange ? (
            <Box sx={{ ml: 1 }}>
              <LayoutToggle layoutMode={layoutMode} onChange={onLayoutModeChange} variant="icon" />
            </Box>
          ) : null}
        </Stack>

        {filteredGames.length !== sessionGames.length && (
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Showing {filteredGames.length} of {sessionGames.length}
          </Typography>
        )}

        {sessionGames.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, maxHeight: 350, overflow: 'auto', pr: 0.5 }}>
            {filteredGames.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>No games match</Typography>
            ) : (
              filteredGames.map((game) => (
                <GameRow
                  key={game.bggId}
                  game={game}
                  owners={gameOwners[game.bggId] ?? []}
                  variant={layoutMode === 'simplified' ? 'compact' : 'standard'}
                  onExcludeFromSession={onExcludeFromSession ? () => onExcludeFromSession(game) : undefined}
                  onOpenDetails={() => setDetailsGame(game)}
                />
              ))
            )}
          </Box>
        ) : (
          <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            No games yet
          </Typography>
        )}

        {(collectionOnlyGames.length > 0 || showAddNewGamesAction) && (
          <Box sx={{ mt: 2 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" sx={{ mb: 1 }}>
              {collectionOnlyGames.length > 0 ? (
                <Button
                  size="small"
                  startIcon={<PlaylistAddIcon />}
                  onClick={() => setShowCollectionGames(!showCollectionGames)}
                >
                  {showCollectionGames
                    ? isMobile
                      ? 'Hide Collection'
                      : `Hide ${collectionOnlyGames.length} games from collection`
                    : isMobile
                      ? 'Show Collection'
                      : `Show ${collectionOnlyGames.length} games from collection`}
                </Button>
              ) : null}

              {showAddNewGamesAction && onToggleAddNewGamesPanel ? (
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={onToggleAddNewGamesPanel}
                  sx={{
                    bgcolor: alpha(colors.sand, 0.65),
                    color: colors.navyBlue,
                    border: `1px solid ${alpha(colors.sand, 0.95)}`,
                    '&:hover': { bgcolor: alpha(colors.sand, 0.8) },
                  }}
                  aria-expanded={addNewGamesPanelOpen ? 'true' : 'false'}
                >
                  {isMobile ? 'Add New Game' : 'Add New Games to Collection'}
                </Button>
              ) : null}
            </Stack>

            {collectionOnlyGames.length > 0 ? (
              <Collapse in={showCollectionGames}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, maxHeight: 200, overflow: 'auto' }}>
                  {collectionOnlyGames.map((game) => (
                    <Box key={game.bggId} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 0.75, bgcolor: 'action.hover', borderRadius: 1, opacity: 0.7 }}>
                      <Box
                        component="img"
                        src={game.thumbnail || '/vite.svg'}
                        alt={game.name}
                        sx={{ width: 28, height: 28, borderRadius: 0.5, objectFit: 'cover' }}
                        onError={(e) => { (e.target as HTMLImageElement).src = '/vite.svg' }}
                      />
                      <Typography variant="body2" sx={{ flex: 1 }} noWrap>{game.name}</Typography>
                      {onAddToSession && (
                        <Tooltip title="Add to session">
                          <IconButton size="small" onClick={() => onAddToSession(game.bggId)}>
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  ))}
                </Box>
              </Collapse>
            ) : null}
          </Box>
        )}
      </CardContent>

      {/* Game Edit Dialog */}
      {onEditGame && (
        <GameEditDialog
          open={!!editingGame}
          game={editingGame}
          onClose={() => setEditingGame(null)}
          onSave={onEditGame}
          onRefreshFromBgg={onRefreshGameFromBgg}
        />
      )}

      <GameDetailsDialog
        open={!!detailsGame}
        game={detailsGame}
        owners={detailsGame ? (gameOwners[detailsGame.bggId] ?? []) : []}
        users={users}
        onClose={() => setDetailsGame(null)}
        onAddOwner={onAddOwner}
        onRemoveOwner={onRemoveOwner}
        onExcludeFromSession={
          detailsGame && onExcludeFromSession
            ? () => {
                onExcludeFromSession(detailsGame)
                setDetailsGame(null)
              }
            : undefined
        }
        onEdit={
          detailsGame && onEditGame
            ? () => {
                setDetailsGame(null)
                setEditingGame(detailsGame)
              }
            : undefined
        }
      />
    </Card>
  )
}
