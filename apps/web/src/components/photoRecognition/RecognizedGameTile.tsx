import { useState } from 'react'
import {
  Autocomplete,
  Box,
  CircularProgress,
  IconButton,
  TextField,
  Typography,
  Alert,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import type { RecognizedGameTile as RecognizedGameTileType, BggMatchResult } from '../../services/openai/photoRecognition'
import { ConfidenceBadge } from './ConfidenceBadge'
import { searchGames } from '../../services/bgg/bggService'

interface SearchResult {
  bggId: number
  name: string
  yearPublished?: number
}

interface RecognizedGameTileProps {
  game: RecognizedGameTileType
  onDismiss: (recognizedName: string) => void
  onAdd: (game: RecognizedGameTileType) => void
  onBggMatch?: (recognizedName: string, match: BggMatchResult) => void
  isAdding?: boolean
  isAdded?: boolean
  addError?: string
}

export function RecognizedGameTile({
  game,
  onDismiss,
  onAdd,
  onBggMatch,
  isAdding = false,
  isAdded = false,
  addError,
}: RecognizedGameTileProps) {
  const { recognizedName, confidence, bggMatch } = game
  const [searchQuery, setSearchQuery] = useState(recognizedName)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [autocompleteOpen, setAutocompleteOpen] = useState(false)

  const isHighConfidenceMatched = confidence === 'high' && bggMatch != null

  const handleSearch = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    try {
      const results = await searchGames(query)
      setSearchResults(results.map(r => ({ bggId: r.bggId, name: r.name, yearPublished: r.yearPublished })))
    } catch {
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectGame = (_event: React.SyntheticEvent, selected: SearchResult | null) => {
    if (selected && onBggMatch) {
      onBggMatch(recognizedName, {
        bggId: selected.bggId,
        name: selected.name,
        yearPublished: selected.yearPublished,
      })
      setAutocompleteOpen(false)
    }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        p: 0.75,
        bgcolor: 'background.default',
        borderRadius: '6px',
        border: '1px solid',
        borderColor: isAdded ? 'success.light' : 'divider',
        opacity: isAdded ? 0.6 : 1,
        transition: 'opacity 0.2s, border-color 0.2s',
      }}
    >
      {/* Confidence badge - always show */}
      <ConfidenceBadge confidence={confidence} />

      {/* Green checkmark for high confidence + BGG match */}
      {isHighConfidenceMatched && (
        <CheckCircleIcon sx={{ color: 'success.main', fontSize: 18, flexShrink: 0, ml: -0.5 }} />
      )}

      {/* Game info section */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {recognizedName}
        </Typography>
        {bggMatch ? (
          <Typography variant="caption" color="text.secondary" noWrap>
            → {bggMatch.name} ({bggMatch.yearPublished ?? 'N/A'})
          </Typography>
        ) : (
          <Autocomplete<SearchResult>
            size="small"
            open={autocompleteOpen && searchResults.length > 0}
            onOpen={() => setAutocompleteOpen(true)}
            onClose={() => setAutocompleteOpen(false)}
            options={searchResults}
            loading={isSearching}
            getOptionLabel={(option) => option.name}
            getOptionKey={(option) => option.bggId}
            filterOptions={(x) => x}
            onChange={handleSelectGame}
            value={null}
            inputValue={searchQuery}
            onInputChange={(_e, value, reason) => {
              if (reason === 'input') {
                setSearchQuery(value)
                void handleSearch(value)
              } else if (reason === 'clear') {
                setSearchQuery('')
                setSearchResults([])
              }
            }}
            noOptionsText="No games found"
            loadingText="Searching..."
            sx={{ mt: 0.5 }}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder="Search BGG to match..."
                InputProps={{
                  ...params.InputProps,
                  sx: { fontSize: '0.75rem', py: 0 },
                  endAdornment: (
                    <>
                      {isSearching ? <CircularProgress size={14} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            renderOption={(optionProps, opt) => {
              const { key, ...rest } = optionProps
              return (
                <Box component="li" key={key} {...rest} sx={{ py: 0.5, px: 1 }}>
                  <Typography variant="body2" noWrap>
                    {opt.name} {opt.yearPublished ? `(${opt.yearPublished})` : ''}
                  </Typography>
                </Box>
              )
            }}
          />
        )}
      </Box>

      {/* Action buttons */}
      {bggMatch && !isAdded && (
        <IconButton
          size="small"
          onClick={() => onAdd(game)}
          disabled={isAdding}
          aria-label={`Add ${recognizedName}`}
          sx={{ width: 32, height: 32, color: 'primary.main' }}
        >
          {isAdding ? <CircularProgress size={16} /> : <AddIcon fontSize="small" />}
        </IconButton>
      )}

      {isAdded && (
        <Typography variant="caption" color="success.main" sx={{ px: 1 }}>
          Added
        </Typography>
      )}

      <IconButton
        size="small"
        onClick={() => onDismiss(recognizedName)}
        aria-label={`Dismiss ${recognizedName}`}
        sx={{ width: 32, height: 32, color: 'text.disabled' }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>

      {addError && (
        <Alert severity="error" sx={{ position: 'absolute', bottom: -24, left: 0, right: 0, py: 0, fontSize: '0.7rem' }}>
          {addError}
        </Alert>
      )}
    </Box>
  )
}
