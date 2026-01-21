import { useState } from 'react'
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
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

interface SearchResult {
  bggId: number
  name: string
  yearPublished?: number
}

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
  searchResults: SearchResult[]
  onAddGame: (bggId: number) => void
  addingGameId?: number | null
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
    addingGameId,
  } = props

  const isMobile = useMediaQuery('(max-width:600px)')
  const [autocompleteOpen, setAutocompleteOpen] = useState(false)

  const handleSelectGame = (_event: React.SyntheticEvent, game: SearchResult | null) => {
    if (game && selectedLocalUsers.length > 0) {
      onAddGame(game.bggId)
      onSearchQueryChange('')
      setAutocompleteOpen(false)
    }
  }

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

        <Autocomplete<SearchResult>
          open={autocompleteOpen && searchResults.length > 0}
          onOpen={() => setAutocompleteOpen(true)}
          onClose={() => setAutocompleteOpen(false)}
          options={searchResults}
          loading={isSearching}
          getOptionLabel={(option) => option.name}
          getOptionKey={(option) => option.bggId}
          filterOptions={(x) => x} // Don't filter client-side, server does it
          onChange={handleSelectGame}
          value={null}
          inputValue={searchQuery}
          onInputChange={(_e, value, reason) => {
            if (reason === 'input') {
              onSearchQueryChange(value)
            } else if (reason === 'clear') {
              onSearchQueryChange('')
            }
          }}
          noOptionsText="No games found"
          loadingText="Searching..."
          disabled={addingGameId != null}
          renderInput={(params) => (
            <TextField
              {...params}
              size="small"
              placeholder="Search BoardGameGeek..."
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {isSearching ? <CircularProgress size={18} /> : null}
                    {params.InputProps.endAdornment}
                    <InputAdornment position="end">
                      <SearchIcon
                        fontSize="small"
                        sx={{ cursor: 'pointer', color: 'action.active' }}
                        onClick={onSearch}
                      />
                    </InputAdornment>
                  </>
                ),
              }}
            />
          )}
          renderOption={(optionProps, game) => {
            const { key, ...rest } = optionProps
            return (
              <Box
                component="li"
                key={key}
                {...rest}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1,
                  px: 1.5,
                }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography fontWeight={500} noWrap>
                    {game.name}
                  </Typography>
                  {game.yearPublished ? (
                    <Typography variant="caption" color="text.secondary">
                      ({game.yearPublished})
                    </Typography>
                  ) : null}
                </Box>
                {selectedLocalUsers.length === 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    Select user first
                  </Typography>
                )}
              </Box>
            )
          }}
        />
      </CardContent>
    </Card>
  )
}
