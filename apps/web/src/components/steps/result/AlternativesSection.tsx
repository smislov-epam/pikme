import { Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import LeaderboardIcon from '@mui/icons-material/Leaderboard'
import type { GameWithScore } from '../ResultStep'
import { AlternativeCard } from './AlternativeCard'
import type { LayoutMode } from '../../../services/storage/uiPreferences'
import { GameRow } from '../GameRow'
import { LayoutToggle } from '../../LayoutToggle'

export function AlternativesSection(props: {
  alternatives: GameWithScore[]
  maxScore: number
  layoutMode?: LayoutMode
  onLayoutModeChange?: (mode: LayoutMode) => void
  onPromoteAlternative: (bggId: number) => void
  onOpenDetails?: (game: GameWithScore['game']) => void
  onExcludeGame: (game: GameWithScore['game']) => void
}) {
  const { alternatives, maxScore, layoutMode = 'standard', onLayoutModeChange, onPromoteAlternative, onOpenDetails, onExcludeGame } = props

  if (alternatives.length === 0) return null

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} mb={2}>
          <Stack direction="row" alignItems="center" gap={1}>
            <LeaderboardIcon color="primary" />
            <Typography variant="subtitle1" fontWeight={600}>
              Top Alternatives
            </Typography>
          </Stack>

          {onLayoutModeChange ? (
            <LayoutToggle layoutMode={layoutMode} onChange={onLayoutModeChange} variant="icon" />
          ) : null}
        </Stack>

        <Stack spacing={2}>
          {alternatives.map((alt, index) =>
            layoutMode === 'simplified' ? (
              <Stack key={alt.game.bggId} spacing={0.75}>
                <GameRow
                  game={alt.game}
                  owners={[]}
                  variant="compact"
                  hidePlayerCount
                  onRowClick={() => onPromoteAlternative(alt.game.bggId)}
                  onOpenDetails={undefined}
                  onExcludeFromSession={() => onExcludeGame(alt.game)}
                  metaRight={(
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Chip label={`#${index + 2}`} size="small" color="primary" />
                      <Chip label={`${alt.score.toFixed(1)} pts`} size="small" color="secondary" sx={{ fontWeight: 700 }} />
                    </Stack>
                  )}
                />
              </Stack>
            ) : (
              <AlternativeCard
                key={alt.game.bggId}
                rank={index + 2}
                game={alt.game}
                score={alt.score}
                maxScore={maxScore}
                matchReasons={alt.matchReasons}
                onPromote={() => onPromoteAlternative(alt.game.bggId)}
                onOpenDetails={onOpenDetails ? () => onOpenDetails(alt.game) : undefined}
              />
            )
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}
