import { Card, CardContent, Stack, Typography } from '@mui/material'
import LeaderboardIcon from '@mui/icons-material/Leaderboard'
import type { GameWithScore } from '../ResultStep'
import { AlternativeCard } from './AlternativeCard'

export function AlternativesSection(props: {
  alternatives: GameWithScore[]
  maxScore: number
  onExcludeGame: (game: GameWithScore['game']) => void
}) {
  const { alternatives, maxScore, onExcludeGame } = props

  if (alternatives.length === 0) return null

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" gap={1} mb={2}>
          <LeaderboardIcon color="primary" />
          <Typography variant="subtitle1" fontWeight={600}>
            Top Alternatives
          </Typography>
        </Stack>

        <Stack spacing={2}>
          {alternatives.map((alt, index) => (
            <AlternativeCard
              key={alt.game.bggId}
              rank={index + 2}
              game={alt.game}
              score={alt.score}
              maxScore={maxScore}
              matchReasons={alt.matchReasons}
              onExclude={() => onExcludeGame(alt.game)}
            />
          ))}
        </Stack>
      </CardContent>
    </Card>
  )
}
