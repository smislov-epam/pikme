import { Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import CloseIcon from '@mui/icons-material/Close'
import type { GameRecord } from '../../db/types'

export interface GameRowProps {
  game: GameRecord
  owners: string[]
  onExcludeFromSession?: () => void
  onOpenDetails: () => void
}

export function GameRow({
  game,
  owners,
  onExcludeFromSession,
  onOpenDetails,
}: GameRowProps) {
  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        borderRadius: '6px',
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
      }}
    >
      <Box
        onClick={onOpenDetails}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          p: 1.25,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <Box
          component="img"
          src={game.thumbnail || '/vite.svg'}
          alt={game.name}
          sx={{ width: 36, height: 36, borderRadius: '6px', objectFit: 'cover', bgcolor: 'grey.200', flexShrink: 0 }}
          onError={(e) => { (e.target as HTMLImageElement).src = '/vite.svg' }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={500} noWrap>{game.name}</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            {game.minPlayers && game.maxPlayers && (
              <Typography variant="caption" color="text.secondary">
                👥 {game.minPlayers === game.maxPlayers ? game.minPlayers : `${game.minPlayers}-${game.maxPlayers}`}
              </Typography>
            )}
            {(game.minPlayTimeMinutes || game.maxPlayTimeMinutes || game.playingTimeMinutes) && (
              <Typography variant="caption" color="text.secondary">
                ⏱️ {formatPlayTime(game)}
              </Typography>
            )}
            {game.averageRating && (
              <Typography variant="caption" color="text.secondary">⭐ {game.averageRating.toFixed(1)}</Typography>
            )}
          </Stack>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          {owners.length > 0 ? (
            <Chip
              label={owners.length === 1 ? owners[0] : `${owners.length}`}
              size="small"
              sx={{ height: 20, fontSize: '0.65rem' }}
            />
          ) : null}

          {onExcludeFromSession ? (
            <Tooltip title="Remove from session">
              <IconButton
                size="small"
                sx={{ width: 36, height: 36 }}
                onClick={(e) => {
                  e.stopPropagation()
                  onExcludeFromSession()
                }}
                aria-label="Remove from session"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}

          <Tooltip title="Open details">
            <IconButton
              size="small"
              sx={{ width: 36, height: 36 }}
              onClick={(e) => {
                e.stopPropagation()
                onOpenDetails()
              }}
            >
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  )
}

function formatPlayTime(game: GameRecord): string {
  const min = game.minPlayTimeMinutes
  const max = game.maxPlayTimeMinutes
  const avg = game.playingTimeMinutes
  if (min && max && min !== max) return `${min}-${max} min`
  if (min) return `${min} min`
  if (max) return `${max} min`
  if (avg) return `${avg} min`
  return ''
}
