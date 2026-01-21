import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material'
import LinkIcon from '@mui/icons-material/Link'
import SearchIcon from '@mui/icons-material/Search'
import StarIcon from '@mui/icons-material/Star'
import type { UserRecord } from '../../db/types'
import { colors } from '../../theme/theme'

export function LocalPlayersGamesCard(props: {
  localUsers: UserRecord[]
  selectedLocalUsers: string[]
  onToggleUser: (username: string) => void
  onSelectAll: () => void
  gameUrlInput: string
  onGameUrlInputChange: (value: string) => void
  onAddGameFromUrl: () => void
  onOpenManualGameDialog?: () => void
  isLoading: boolean
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  onSearch: () => void
  isSearching: boolean
  searchResults: Array<{ bggId: number; name: string; yearPublished?: number }>
  onAddGame: (bggId: number) => void
}) {
  const {
    localUsers,
    selectedLocalUsers,
    onToggleUser,
    onSelectAll,
    gameUrlInput,
    onGameUrlInputChange,
    onAddGameFromUrl,
    onOpenManualGameDialog,
    isLoading,
    searchQuery,
    onSearchQueryChange,
    onSearch,
    isSearching,
    searchResults,
    onAddGame,
  } = props

  const isMobile = useMediaQuery('(max-width:600px)')

  return (
    <Card sx={{ bgcolor: colors.sand + '20' }}>
        <CardContent>
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" gap={1} mb={1}>
            <Typography variant="caption" color="text.secondary">
              Select users to add games to:
            </Typography>
            {localUsers.length > 1 ? (
              <Button size="small" onClick={onSelectAll} sx={{ fontSize: '0.7rem', py: 0 }}>
                Select all
              </Button>
            ) : null}
          </Stack>

          <Stack direction="row" flexWrap="wrap" gap={1}>
            {localUsers.map((user) => (
              <Chip
                key={user.username}
                size="small"
                label={user.displayName || user.username}
                onClick={() => onToggleUser(user.username)}
                variant={selectedLocalUsers.includes(user.username) ? 'filled' : 'outlined'}
                color={selectedLocalUsers.includes(user.username) ? 'primary' : 'default'}
                icon={user.isOrganizer ? <StarIcon sx={{ fontSize: 16 }} /> : undefined}
                sx={{ height: 28 }}
              />
            ))}
          </Stack>

          {selectedLocalUsers.length > 0 ? (
            <Typography variant="caption" color="primary" sx={{ mt: 0.5, display: 'block' }}>
              ✓ Games will be added to: {selectedLocalUsers.join(', ')}
            </Typography>
          ) : null}
        </Box>

        <Box
          sx={{
            display: 'flex',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Paste BGG link (e.g. boardgamegeek.com/boardgame/123/game)"
            value={gameUrlInput}
            onChange={(e) => onGameUrlInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onAddGameFromUrl()}
            sx={{
              flex: 1,
              '& .MuiOutlinedInput-root': {
                borderRadius: 0,
                '& fieldset': { border: 'none' },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LinkIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            onClick={onAddGameFromUrl}
            disabled={isLoading}
            sx={{
              borderRadius: 0,
              minWidth: isMobile ? 56 : 88,
              px: isMobile ? 1.5 : 2.75,
              boxShadow: 'none',
            }}
          >
            {isLoading ? (
              <CircularProgress size={16} color="inherit" />
            ) : isMobile ? (
              '+'
            ) : (
              '+ Add'
            )}
          </Button>
        </Box>

        {onOpenManualGameDialog ? (
          <Box sx={{ mt: 1 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={onOpenManualGameDialog}
              disabled={selectedLocalUsers.length === 0 || isLoading}
              sx={{ height: 32 }}
            >
              Entry manually
            </Button>
          </Box>
        ) : null}

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', my: 1 }}>
          — or search (requires API key) —
        </Typography>

        <TextField
          fullWidth
          size="small"
          placeholder="Search BoardGameGeek..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={onSearch} disabled={isSearching} size="small" sx={{ width: 36, height: 36 }}>
                  {isSearching ? <CircularProgress size={18} /> : <SearchIcon fontSize="small" />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {searchResults.length > 0 ? (
          <Stack spacing={1} sx={{ mt: 2 }}>
            {searchResults.map((game) => (
              <Box
                key={game.bggId}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 1.25,
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={500} noWrap>
                    {game.name}
                  </Typography>
                  {game.yearPublished ? (
                    <Typography variant="caption" color="text.secondary">
                      ({game.yearPublished})
                    </Typography>
                  ) : null}
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onAddGame(game.bggId)}
                  disabled={selectedLocalUsers.length === 0}
                  sx={{ height: 32 }}
                >
                  Add
                </Button>
              </Box>
            ))}
          </Stack>
        ) : null}
      </CardContent>
    </Card>
  )
}
