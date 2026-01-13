import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import PeopleIcon from '@mui/icons-material/People'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import StarIcon from '@mui/icons-material/Star'
import type { GameRecord } from '../../db/types'
import { formatPlayTime, getComplexityColor, getComplexityLabel } from './gameEditUtils'
import { GameNotesPanel } from '../gameNotes/GameNotesPanel'

export function GameEditSummaryPane(props: {
  game: GameRecord
  onRequestRefresh?: () => void
  isRefreshing?: boolean
}) {
  const { game, onRequestRefresh, isRefreshing } = props

  return (
    <Stack spacing={1.5}>
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
            BGG #{game.bggId}
          </Typography>
        </Box>

        {onRequestRefresh ? (
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={onRequestRefresh}
            disabled={!!isRefreshing}
            sx={{ height: 40, borderRadius: 1.5, whiteSpace: 'nowrap' }}
          >
            Refresh
          </Button>
        ) : null}
      </Stack>

      <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {game.minPlayers && game.maxPlayers ? (
                <Chip icon={<PeopleIcon />} label={`${game.minPlayers}-${game.maxPlayers} players`} variant="outlined" />
              ) : null}
              {(game.playingTimeMinutes || game.minPlayTimeMinutes || game.maxPlayTimeMinutes) ? (
                <Chip icon={<AccessTimeIcon />} label={formatPlayTime(game)} variant="outlined" />
              ) : null}
              {game.averageRating ? (
                <Chip
                  icon={<StarIcon sx={{ color: 'warning.main' }} />}
                  label={`${game.averageRating.toFixed(1)}/10`}
                  variant="outlined"
                />
              ) : null}
              {game.weight ? (
                <Chip
                  label={`${getComplexityLabel(game.weight)} (${game.weight.toFixed(1)}/5)`}
                  sx={{ bgcolor: getComplexityColor(game.weight), color: 'white' }}
                />
              ) : null}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <GameNotesPanel bggId={game.bggId} height={200} />
    </Stack>
  )
}
