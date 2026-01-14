import { Chip, LinearProgress, Stack } from '@mui/material'
import type { GameRecord } from '../../../db/types'
import { GameTile } from '../GameTile'

export function AlternativeCard(props: {
  rank: number
  game: GameRecord
  score: number
  maxScore: number
  matchReasons: string[]
  onPromote: () => void
  onOpenDetails?: () => void
}) {
  const { rank, game, score, maxScore, matchReasons, onPromote } = props
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0

  return (
    <GameTile
      game={game}
      onClick={onPromote}
      trailing={
        <Stack spacing={0.5} alignItems="flex-end">
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Chip
              label={`#${rank}`}
              size="small"
              sx={{ bgcolor: 'primary.light', color: 'primary.dark', fontWeight: 800, minWidth: 44 }}
            />
            <Chip label={`${score.toFixed(1)} pts`} size="small" color="secondary" sx={{ fontWeight: 700 }} />
          </Stack>
        </Stack>
      }
    >
      <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.25 }}>
        {matchReasons.slice(0, 2).map((reason, i) => (
          <Chip key={i} label={reason} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
        ))}
      </Stack>

      <LinearProgress
        variant="determinate"
        value={percentage}
        sx={{ height: 6, borderRadius: 3, bgcolor: 'divider' }}
      />
    </GameTile>
  )
}
