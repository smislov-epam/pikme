import { useState } from 'react'
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Card, CardContent, Stack, Typography } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import type { GameRecord, UserRecord } from '../../../db/types'
import type { LayoutMode } from '../../../services/storage/uiPreferences'
import { useToast } from '../../../services/toast'
import { LayoutToggle } from '../../LayoutToggle'
import { GameDetailsDialog } from '../../gameDetails/GameDetailsDialog'
import { GameRow } from '../GameRow'
import { FilteredGameCard } from './FilteredGameCard'

export interface FiltersResultsSectionProps {
  games: GameRecord[]
  users: UserRecord[]
  gameOwners: Record<number, string[]>
  layoutMode: LayoutMode
  onLayoutModeChange: (mode: LayoutMode) => void
  filteredGames: GameRecord[]
  onExcludeGameFromSession: (bggId: number) => void
  onUndoExcludeGameFromSession: (bggId: number) => void
}

export function FiltersResultsSection({
  games,
  users,
  gameOwners,
  layoutMode,
  onLayoutModeChange,
  filteredGames,
  onExcludeGameFromSession,
  onUndoExcludeGameFromSession,
}: FiltersResultsSectionProps) {
  const toast = useToast()
  const [detailsGame, setDetailsGame] = useState<GameRecord | null>(null)

  const noGamesMatch = filteredGames.length === 0 && games.length > 0

  const exclude = (game: GameRecord) => {
    onExcludeGameFromSession(game.bggId)
    toast.info(`Excluded “${game.name}” from this session`, {
      autoHideMs: 5500,
      actionLabel: 'Undo',
      onAction: () => onUndoExcludeGameFromSession(game.bggId),
    })
  }

  if (noGamesMatch) {
    return (
      <Alert severity="warning" sx={{ borderRadius: 3 }}>
        <Typography fontWeight={600}>No games match your filters</Typography>
        <Typography variant="body2">Try increasing time, changing player count, or relaxing the game mode preference.</Typography>
      </Alert>
    )
  }

  return (
    <>
      <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h4">{filteredGames.length}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                games match your filters
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              out of {games.length} total
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Accordion
        defaultExpanded
        sx={{
          bgcolor: 'background.paper',
          borderRadius: '20px !important',
          '&:before': { display: 'none' },
          boxShadow: (theme) => theme.shadows[1],
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} component="div" sx={{ pr: 1 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
            <Typography fontWeight={500}>Preview matching games</Typography>
            <Box onClick={(e) => e.stopPropagation()} sx={{ mr: 1 }}>
              <LayoutToggle layoutMode={layoutMode} onChange={onLayoutModeChange} variant="icon" />
            </Box>
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1}>
            {filteredGames.slice(0, 10).map((game) => {
              const onExclude = () => exclude(game)

              if (layoutMode === 'simplified') {
                return (
                  <GameRow
                    key={game.bggId}
                    game={game}
                    owners={[]}
                    variant="compact"
                    hidePlayerCount
                    onExcludeFromSession={onExclude}
                    onOpenDetails={() => setDetailsGame(game)}
                  />
                )
              }

              return (
                <FilteredGameCard
                  key={game.bggId}
                  game={game}
                  onOpenDetails={() => setDetailsGame(game)}
                  onExclude={onExclude}
                />
              )
            })}

            {filteredGames.length > 10 && (
              <Typography variant="caption" color="text.secondary" sx={{ pt: 1, textAlign: 'center' }}>
                +{filteredGames.length - 10} more games
              </Typography>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>

      <GameDetailsDialog
        open={!!detailsGame}
        game={detailsGame}
        owners={detailsGame ? (gameOwners[detailsGame.bggId] ?? []) : []}
        users={users}
        onClose={() => setDetailsGame(null)}
        onExcludeFromSession={
          detailsGame
            ? () => {
                exclude(detailsGame)
                setDetailsGame(null)
              }
            : undefined
        }
      />
    </>
  )
}
