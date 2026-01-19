import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import StarIcon from '@mui/icons-material/Star'

export interface ManualGameData {
  name: string
  bggId: number
  minPlayers?: number
  maxPlayers?: number
  bestWith?: string
  playingTimeMinutes?: number
  minPlayTimeMinutes?: number
  maxPlayTimeMinutes?: number
  minAge?: number
  thumbnail?: string
  image?: string
  averageRating?: number
  weight?: number
  categories?: string[]
  mechanics?: string[]
  description?: string
}

// Delete User Dialog
interface DeleteUserDialogProps {
  open: boolean
  username: string | null
  onClose: () => void
  onRemoveFromSession: () => void
  onDeletePermanently: () => void
}

export function DeleteUserDialog({
  open, username, onClose, onRemoveFromSession, onDeletePermanently,
}: DeleteUserDialogProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Remove {username}?</DialogTitle>
      <DialogContent>
        <Typography variant="body2" gutterBottom>
          Choose how to remove this player:
        </Typography>
        <Stack spacing={1} sx={{ mt: 2 }}>
          <Button variant="outlined" fullWidth onClick={onRemoveFromSession}>
            Remove from session only
          </Button>
          <Button variant="contained" color="error" fullWidth startIcon={<DeleteIcon />} onClick={onDeletePermanently}>
            Delete permanently (incl. games)
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  )
}

// Manual Game Entry Dialog
interface ManualGameDialogProps {
  open: boolean
  game: ManualGameData
  isLoading?: boolean
  mode?: 'bgg' | 'manual'
  onGameChange: (game: ManualGameData) => void
  onClose: () => void
  onSubmit: () => void
}

export function ManualGameDialog({
  open, game, isLoading, mode = 'bgg', onGameChange, onClose, onSubmit,
}: ManualGameDialogProps) {
  const hasName = !!game.name?.trim()
  const hasBggId = Number.isInteger(game.bggId) && game.bggId > 0
  const hasPlayers = !!game.minPlayers && !!game.maxPlayers
  const hasTime = !!game.minPlayTimeMinutes || !!game.maxPlayTimeMinutes || !!game.playingTimeMinutes
  const hasExtraData = !!game.bestWith || !!game.averageRating || !!game.weight || (game.categories && game.categories.length > 0)
  const allFound = hasName && hasPlayers && hasTime
  const bggUrl = game.bggId > 0 ? `https://boardgamegeek.com/boardgame/${game.bggId}` : null
  const imageUrlValue = game.image || game.thumbnail || ''

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {mode === 'manual' ? 'Add Game Manually' : 'Add Game from BGG'}
        {bggUrl && (
          <Link href={bggUrl} target="_blank" rel="noopener" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.875rem' }}>
            View on BGG <OpenInNewIcon sx={{ fontSize: 16 }} />
          </Link>
        )}
      </DialogTitle>
      <DialogContent>
        {isLoading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4 }}>
            <CircularProgress size={32} />
            <Typography>Extracting game info from BGG...</Typography>
            <Typography variant="caption" color="text.secondary">
              This may take a moment...
            </Typography>
          </Box>
        ) : (
          <Stack spacing={2} sx={{ mt: 1 }}>
            {/* Status message */}
            {mode === 'manual' ? (
              <Alert severity="info" sx={{ py: 0.5 }}>
                BGG ID is required and helps PIKME sync/refresh this game in the future.
              </Alert>
            ) : allFound && hasExtraData ? (
              <Alert severity="success" sx={{ py: 0.5 }}>
                ✅ All game details extracted successfully!
              </Alert>
            ) : allFound ? (
              <Alert severity="success" sx={{ py: 0.5 }}>
                Core details found. Review and confirm.
              </Alert>
            ) : (
              <Alert severity="info" sx={{ py: 0.5 }}>
                {hasName || hasPlayers || hasTime || game.thumbnail
                  ? 'Some details were extracted. Fill in missing fields.'
                  : 'Could not extract details. Please enter manually.'}
                {bggUrl && !hasName && (
                  <Link href={bggUrl} target="_blank" rel="noopener" sx={{ display: 'block', mt: 0.5, fontSize: '0.875rem' }}>
                    Open BGG page to copy details →
                  </Link>
                )}
              </Alert>
            )}

            {/* Game Preview Card */}
            {(game.thumbnail || hasExtraData) && (
              <Box sx={{ display: 'flex', gap: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                {game.thumbnail && (
                  <Box
                    component="img"
                    src={game.thumbnail}
                    alt={game.name || 'Game'}
                    sx={{ width: 80, height: 80, borderRadius: 1.5, objectFit: 'cover', bgcolor: 'grey.300', flexShrink: 0 }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {game.name && <Typography fontWeight={600} noWrap>{game.name}</Typography>}
                  
                  {/* Rating and Weight */}
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.5 }}>
                    {game.bestWith && (
                      <Chip
                        label={`Best: ${game.bestWith}`}
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    )}
                    {game.averageRating && (
                      <Stack direction="row" spacing={0.3} alignItems="center">
                        <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                        <Typography variant="body2" fontWeight={500}>{game.averageRating.toFixed(1)}</Typography>
                      </Stack>
                    )}
                    {game.weight && (
                      <Chip
                        label={getComplexityLabel(game.weight)}
                        size="small"
                        sx={{ height: 20, fontSize: '0.7rem', bgcolor: getComplexityColor(game.weight), color: 'white' }}
                      />
                    )}
                  </Stack>

                  {/* Categories */}
                  {game.categories && game.categories.length > 0 && (
                    <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                      {game.categories.slice(0, 4).map((cat) => (
                        <Chip key={cat} label={cat} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />
                      ))}
                    </Stack>
                  )}
                </Box>
              </Box>
            )}

            {/* Form fields */}
            <TextField
              label="BGG ID"
              type="number"
              value={game.bggId || ''}
              onChange={(e) => onGameChange({ ...game, bggId: parseInt(e.target.value, 10) || 0 })}
              required
              fullWidth
              disabled={mode !== 'manual'}
              error={!hasBggId}
              helperText={!hasBggId ? 'Required (BoardGameGeek numeric ID)' : undefined}
              size="small"
              inputProps={{ min: 1 }}
              InputProps={{
                endAdornment: hasBggId ? <CheckCircleIcon color="success" sx={{ fontSize: 18 }} /> : undefined,
              }}
            />

            <TextField
              label="Game Name"
              value={game.name}
              onChange={(e) => onGameChange({ ...game, name: e.target.value })}
              required
              fullWidth
              error={!hasName}
              helperText={!hasName ? 'Required' : undefined}
              size="small"
              InputProps={{
                endAdornment: hasName ? <CheckCircleIcon color="success" sx={{ fontSize: 18 }} /> : undefined,
              }}
            />

            <TextField
              label="Image URL"
              value={imageUrlValue}
              onChange={(e) => {
                const url = e.target.value
                onGameChange({
                  ...game,
                  image: url || undefined,
                  thumbnail: url || undefined,
                })
              }}
              fullWidth
              size="small"
              placeholder="Paste a link to a game image"
              helperText="Optional"
            />

            <Stack direction="row" spacing={2}>
              <TextField
                label="Min Players"
                type="number"
                value={game.minPlayers || ''}
                onChange={(e) => onGameChange({ ...game, minPlayers: parseInt(e.target.value) || undefined })}
                inputProps={{ min: 1, max: 20 }}
                size="small"
                sx={{ flex: 1 }}
                InputProps={{
                  endAdornment: game.minPlayers ? <CheckCircleIcon color="success" sx={{ fontSize: 16 }} /> : undefined,
                }}
              />
              <TextField
                label="Max Players"
                type="number"
                value={game.maxPlayers || ''}
                onChange={(e) => onGameChange({ ...game, maxPlayers: parseInt(e.target.value) || undefined })}
                inputProps={{ min: 1, max: 20 }}
                size="small"
                sx={{ flex: 1 }}
                InputProps={{
                  endAdornment: game.maxPlayers ? <CheckCircleIcon color="success" sx={{ fontSize: 16 }} /> : undefined,
                }}
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField
                label="Min Time (min)"
                type="number"
                value={game.minPlayTimeMinutes || ''}
                onChange={(e) => onGameChange({ ...game, minPlayTimeMinutes: parseInt(e.target.value) || undefined })}
                inputProps={{ min: 5, max: 600 }}
                size="small"
                sx={{ flex: 1 }}
                InputProps={{
                  endAdornment: game.minPlayTimeMinutes ? <CheckCircleIcon color="success" sx={{ fontSize: 16 }} /> : undefined,
                }}
              />
              <TextField
                label="Max Time (min)"
                type="number"
                value={game.maxPlayTimeMinutes || ''}
                onChange={(e) => onGameChange({ ...game, maxPlayTimeMinutes: parseInt(e.target.value) || undefined })}
                inputProps={{ min: 5, max: 600 }}
                size="small"
                sx={{ flex: 1 }}
                InputProps={{
                  endAdornment: game.maxPlayTimeMinutes ? <CheckCircleIcon color="success" sx={{ fontSize: 16 }} /> : undefined,
                }}
              />
              <TextField
                label="Min Age"
                type="number"
                value={game.minAge || ''}
                onChange={(e) => onGameChange({ ...game, minAge: parseInt(e.target.value) || undefined })}
                inputProps={{ min: 0, max: 21 }}
                size="small"
                sx={{ flex: 1 }}
                InputProps={{
                  endAdornment: game.minAge ? <CheckCircleIcon color="success" sx={{ fontSize: 16 }} /> : undefined,
                }}
              />
            </Stack>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>Cancel</Button>
        <Button variant="contained" onClick={onSubmit} disabled={!game.name?.trim() || !hasBggId || isLoading}>
          Add Game
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function getComplexityLabel(weight: number): string {
  if (weight < 1.5) return 'Light'
  if (weight < 2.5) return 'Easy'
  if (weight < 3.5) return 'Medium'
  if (weight < 4.5) return 'Heavy'
  return 'Complex'
}

function getComplexityColor(weight: number): string {
  if (weight < 1.5) return '#4caf50'
  if (weight < 2.5) return '#8bc34a'
  if (weight < 3.5) return '#ff9800'
  if (weight < 4.5) return '#f44336'
  return '#9c27b0'
}
