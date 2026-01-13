import {
  Alert,
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import type { GameRecord, UserRecord } from '../../db/types'
import { colors } from '../../theme/theme'
import type { WizardFilters } from '../../store/wizardTypes'
import { TonightsPickCard } from './result/TonightsPickCard'
import { AlternativesSection } from './result/AlternativesSection'
import { useToast } from '../../services/toast'
import { GameDetailsDialog } from '../gameDetails/GameDetailsDialog'

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
  onSaveNight: () => void
  onExcludeGameFromSession: (bggId: number) => void
  onUndoExcludeGameFromSession: (bggId: number) => void
}

export function ResultStep({
  topPick,
  alternatives,
  vetoed = [],
  filters,
  users,
  gameOwners,
  onExcludeGameFromSession,
  onUndoExcludeGameFromSession,
}: ResultStepProps) {
  const toast = useToast()
  const [detailsGame, setDetailsGame] = useState<GameRecord | null>(null)
  const maxScore = Math.max(
    topPick?.score ?? 0,
    ...alternatives.map((a) => a.score)
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
      <Box>
        <Typography variant="h5" gutterBottom sx={{ color: 'primary.dark' }}>
          Your recommendation is ready!
        </Typography>
        <Typography color="text.secondary">
          Based on your group's preferences and filters
        </Typography>
      </Box>

      <TonightsPickCard
        topPick={topPick}
        filters={filters}
        onOpenDetails={() => setDetailsGame(topPick.game)}
        onExcludeFromSession={() => {
          onExcludeGameFromSession(topPick.game.bggId)
          toast.info(`Excluded “${topPick.game.name}” from this session`, {
            autoHideMs: 5500,
            actionLabel: 'Undo',
            onAction: () => onUndoExcludeGameFromSession(topPick.game.bggId),
          })
        }}
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
        onOpenDetails={(game) => setDetailsGame(game)}
        onExcludeGame={(game) => {
          onExcludeGameFromSession(game.bggId)
          toast.info(`Excluded “${game.name}” from this session`, {
            autoHideMs: 5500,
            actionLabel: 'Undo',
            onAction: () => onUndoExcludeGameFromSession(game.bggId),
          })
        }}
      />

      <GameDetailsDialog
        open={!!detailsGame}
        game={detailsGame}
        owners={detailsGame ? (gameOwners[detailsGame.bggId] ?? []) : []}
        users={users}
        onClose={() => setDetailsGame(null)}
        onExcludeFromSession={
          detailsGame
            ? () => {
                onExcludeGameFromSession(detailsGame.bggId)
                toast.info(`Excluded “${detailsGame.name}” from this session`, {
                  autoHideMs: 5500,
                  actionLabel: 'Undo',
                  onAction: () => onUndoExcludeGameFromSession(detailsGame.bggId),
                })
                setDetailsGame(null)
              }
            : undefined
        }
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
