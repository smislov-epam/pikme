import {
  Alert,
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameRecord, UserRecord } from '../../db/types'
import { colors } from '../../theme/theme'
import type { WizardFilters } from '../../store/wizardTypes'
import { TonightsPickCard } from './result/TonightsPickCard'
import { AlternativesSection } from './result/AlternativesSection'
import { GameDetailsDialog } from '../gameDetails/GameDetailsDialog'
import type { LayoutMode } from '../../services/storage/uiPreferences'
import { trackAlternativePromoted, trackTonightsPickReady } from '../../services/analytics/googleAnalytics'

export interface GameWithScore {
  game: GameRecord
  score: number
  matchReasons: string[]
}

export interface ResultStepProps {
  topPick: GameWithScore | null
  alternatives: GameWithScore[]
  vetoed?: Array<{ game: GameRecord; vetoedBy: string[] }>
  filters: WizardFilters
  users: UserRecord[]
  gameOwners: Record<number, string[]>
  layoutMode: LayoutMode
  onLayoutModeChange: (mode: LayoutMode) => void
  onPromoteAlternative: (bggId: number) => void
  onSaveNight: () => void
}

export function ResultStep({
  topPick,
  alternatives,
  vetoed = [],
  filters,
  users,
  gameOwners,
  layoutMode,
  onLayoutModeChange,
  onPromoteAlternative,
}: ResultStepProps) {
  const theme = useTheme()
  const isNarrow = useMediaQuery(theme.breakpoints.down('sm'))
  const [detailsGame, setDetailsGame] = useState<GameRecord | null>(null)
  const lastTrackedPickRef = useRef<number | null>(null)
  const maxScore = Math.max(
    topPick?.score ?? 0,
    ...alternatives.map((a) => a.score)
  )

  useEffect(() => {
    if (!topPick) {
      lastTrackedPickRef.current = null
      return
    }
    if (lastTrackedPickRef.current === topPick.game.bggId) return
    trackTonightsPickReady({
      bggId: topPick.game.bggId,
      name: topPick.game.name,
      score: topPick.score,
      matchReasons: topPick.matchReasons,
      playerCount: users.length,
      filters,
      alternativeCount: alternatives.length,
    })
    lastTrackedPickRef.current = topPick.game.bggId
  }, [alternatives.length, filters, topPick, users.length])

  const handlePromoteAlternative = useCallback(
    (alternative: GameWithScore, index: number) => {
      trackAlternativePromoted({
        bggId: alternative.game.bggId,
        name: alternative.game.name,
        rank: index + 2,
        score: alternative.score,
        playerCount: users.length,
        filters,
      })
      onPromoteAlternative(alternative.game.bggId)
    },
    [filters, onPromoteAlternative, users.length],
  )

  if (!topPick) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No recommendation available
          </Typography>
          {vetoed.length > 0 ? (
            <Stack spacing={1}>
              <Typography color="text.secondary">
                All eligible games were vetoed (disliked) by at least one player.
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Remove dislikes or loosen filters to get a recommendation.
              </Typography>
              <Box sx={{ mt: 1 }}>
                {vetoed.slice(0, 5).map((v) => (
                  <Typography key={v.game.bggId} variant="body2" color="text.secondary">
                    Excluded: {v.game.name} (vetoed by {v.vetoedBy.join(', ') || 'unknown'})
                  </Typography>
                ))}
                {vetoed.length > 5 && (
                  <Typography variant="body2" color="text.secondary">
                    …and {vetoed.length - 5} more
                  </Typography>
                )}
              </Box>
            </Stack>
          ) : (
            <Typography color="text.secondary">
              Try adjusting your filters or adding more player preferences
            </Typography>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Stack spacing={3}>
      {/* Header */}
      {!isNarrow ? (
        <Box>
          <Typography variant="h5" gutterBottom sx={{ color: 'primary.dark' }}>
            Your recommendation is ready!
          </Typography>
          <Typography color="text.secondary">
            Based on your group's preferences and filters
          </Typography>
        </Box>
      ) : null}

      <TonightsPickCard
        topPick={topPick}
        filters={filters}
        onOpenDetails={() => setDetailsGame(topPick.game)}
      />

      {vetoed.length > 0 && (
        <Alert severity="info">
          Excluded {vetoed.length} game{vetoed.length === 1 ? '' : 's'} due to player veto.
          {vetoed[0] ? ` Example: ${vetoed[0].game.name} (vetoed by ${vetoed[0].vetoedBy.join(', ') || 'unknown'})` : ''}
        </Alert>
      )}

      <AlternativesSection
        alternatives={alternatives}
        maxScore={maxScore}
        layoutMode={layoutMode}
        onLayoutModeChange={onLayoutModeChange}
        onPromoteAlternative={handlePromoteAlternative}
        onOpenDetails={(game) => setDetailsGame(game)}
      />

      <GameDetailsDialog
        open={!!detailsGame}
        game={detailsGame}
        owners={detailsGame ? (gameOwners[detailsGame.bggId] ?? []) : []}
        users={users}
        onClose={() => setDetailsGame(null)}
      />

      {/* Save reminder */}
      <Card sx={{ bgcolor: colors.sand + '30' }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            💾 Don't forget to save your game night to keep track of what you played!
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  )
}
