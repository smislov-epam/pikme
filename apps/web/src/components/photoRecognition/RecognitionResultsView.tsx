import { Box, Typography, Button, Divider, CircularProgress } from '@mui/material'
import type { RecognizedGameTile as RecognizedGameTileType, BggMatchResult } from '../../services/openai/photoRecognition'
import { RecognizedGameTile } from './RecognizedGameTile'

interface RecognitionResultsViewProps {
  games: RecognizedGameTileType[]
  onDismiss: (recognizedName: string) => void
  onAdd: (game: RecognizedGameTileType) => void
  onAddAll: () => void
  onBggMatch: (recognizedName: string, match: BggMatchResult) => void
  addingGames: Set<string>
  addedGames: Set<string>
  addErrors: Map<string, string>
  isBulkAdding?: boolean
}

export function RecognitionResultsView({
  games,
  onDismiss,
  onAdd,
  onAddAll,
  onBggMatch,
  addingGames,
  addedGames,
  addErrors,
  isBulkAdding = false,
}: RecognitionResultsViewProps) {
  const gamesWithBggMatch = games.filter((g) => g.bggMatch)
  const addableGames = gamesWithBggMatch.filter((g) => !addedGames.has(g.recognizedName))
  const hasAddableGames = addableGames.length > 0

  if (games.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          No games recognized in this photo.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Try a clearer photo showing game boxes or titles.
        </Typography>
      </Box>
    )
  }

  // Sort by confidence: high → medium → low
  const sortedGames = [...games].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.confidence] - order[b.confidence]
  })

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Recognized Games ({games.length})
        </Typography>
        {hasAddableGames && (
          <Button variant="outlined" size="small" onClick={onAddAll}>
            Add All ({addableGames.length})
          </Button>
        )}
      </Box>

      <Divider sx={{ mb: 2 }} />

      {isBulkAdding ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 2 }}>
          <CircularProgress size={32} />
          <Typography variant="body2" color="text.secondary">
            Adding {addableGames.length} games to your collection...
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {addedGames.size} of {addableGames.length + addedGames.size} added
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            maxHeight: 320,
            overflowY: 'auto',
            pr: 0.5,
          }}
        >
          {sortedGames.map((game) => (
            <RecognizedGameTile
              key={game.id}
              game={game}
              onDismiss={onDismiss}
              onAdd={onAdd}
              onBggMatch={onBggMatch}
              isAdding={addingGames.has(game.recognizedName)}
              isAdded={addedGames.has(game.recognizedName)}
              addError={addErrors.get(game.recognizedName)}
            />
          ))}
        </Box>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
        Dismiss tiles you don&apos;t want. Games without BGG matches can be searched manually.
      </Typography>
    </Box>
  )
}
