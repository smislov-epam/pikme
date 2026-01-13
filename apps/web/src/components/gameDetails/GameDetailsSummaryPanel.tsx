import {
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import PeopleIcon from '@mui/icons-material/People'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import StarIcon from '@mui/icons-material/Star'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import EditIcon from '@mui/icons-material/Edit'
import type { GameRecord } from '../../db/types'
import { formatPlayTime, getComplexityColor, getComplexityLabel } from '../gameEdit/gameEditUtils'

export function GameDetailsSummaryPanel(props: {
  game: GameRecord
  onEdit?: () => void
}) {
  const { game, onEdit } = props

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1.25}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              component="img"
              src={game.thumbnail || '/vite.svg'}
              alt={game.name}
              sx={{
                width: { xs: 72, sm: 88 },
                height: { xs: 72, sm: 88 },
                borderRadius: 1.5,
                objectFit: 'contain',
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                flexShrink: 0,
              }}
              onError={(e) => {
                ;(e.target as HTMLImageElement).src = '/vite.svg'
              }}
            />

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" fontWeight={700} noWrap>
                {game.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                BGG #{game.bggId}{game.yearPublished ? ` • ${game.yearPublished}` : ''}
              </Typography>
            </Box>

            <Stack direction="row" spacing={0.5} alignItems="center" flexShrink={0}>
              {onEdit ? (
                <Tooltip title="Edit game">
                  <IconButton size="small" onClick={onEdit} sx={{ width: 36, height: 36 }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : null}
              <Tooltip title="View on BGG">
                <IconButton
                  size="small"
                  component="a"
                  href={`https://boardgamegeek.com/boardgame/${game.bggId}`}
                  target="_blank"
                  rel="noreferrer"
                  sx={{ width: 36, height: 36 }}
                >
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            {game.minPlayers && game.maxPlayers ? (
              <Chip
                icon={<PeopleIcon />}
                label={`${game.minPlayers}-${game.maxPlayers} players`}
                variant="outlined"
                sx={{ height: 28 }}
              />
            ) : null}
            {(game.playingTimeMinutes || game.minPlayTimeMinutes || game.maxPlayTimeMinutes) ? (
              <Chip
                icon={<AccessTimeIcon />}
                label={formatPlayTime(game)}
                variant="outlined"
                sx={{ height: 28 }}
              />
            ) : null}
            {game.averageRating ? (
              <Chip
                icon={<StarIcon sx={{ color: 'warning.main' }} />}
                label={`${game.averageRating.toFixed(1)}/10`}
                variant="outlined"
                sx={{ height: 28 }}
              />
            ) : null}
            {game.weight ? (
              <Chip
                label={`${getComplexityLabel(game.weight)} (${game.weight.toFixed(1)}/5)`}
                sx={{ bgcolor: getComplexityColor(game.weight), color: 'white', height: 28 }}
              />
            ) : null}
            {game.bestWith ? (
              <Chip label={`Best: ${game.bestWith}`} variant="outlined" sx={{ height: 28 }} />
            ) : null}
            {game.minAge ? (
              <Chip label={`Age: ${game.minAge}+`} variant="outlined" sx={{ height: 28 }} />
            ) : null}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}
