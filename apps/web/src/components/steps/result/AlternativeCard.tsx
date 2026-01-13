import {
  Chip,
  IconButton,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import type { GameRecord } from '../../../db/types'
import { GameTile } from '../GameTile'

export function AlternativeCard(props: {
  rank: number
  game: GameRecord
  score: number
  maxScore: number
  matchReasons: string[]
  onOpenDetails?: () => void
  onExclude: () => void
}) {
  const { rank, game, score, maxScore, matchReasons, onOpenDetails, onExclude } = props
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0

  return (
    <GameTile
      game={game}
      onClick={onOpenDetails}
      leading={
        <Chip
          label={`#${rank}`}
          size="small"
          sx={{ bgcolor: 'primary.light', color: 'primary.dark', fontWeight: 800, minWidth: 44 }}
        />
      }
      actions={
        <IconButton size="small" onClick={onExclude} aria-label="Exclude from session">
          <CloseIcon fontSize="small" />
        </IconButton>
      }
    >
      <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.25 }}>
        {matchReasons.slice(0, 2).map((reason, i) => (
          <Chip key={i} label={reason} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
        ))}
      </Stack>

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="caption" color="text.secondary">
          Score
        </Typography>
        <Typography variant="caption" fontWeight={700}>
          {score} pts
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={percentage}
        sx={{ height: 6, borderRadius: 3, bgcolor: 'divider' }}
      />
    </GameTile>
  )
}
