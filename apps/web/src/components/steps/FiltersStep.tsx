import { useMemo, useState } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Card,
  CardContent,
  IconButton,
  Slider,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CloseIcon from '@mui/icons-material/Close'
import ScheduleIcon from '@mui/icons-material/Schedule'
import type { GameRecord, UserRecord } from '../../db/types'
import { AdvancedFiltersAccordion } from './AdvancedFiltersAccordion'
import { GameTile } from './GameTile'
import { GameRow } from './GameRow'
import { GameDetailsDialog } from '../gameDetails/GameDetailsDialog'
import { useToast } from '../../services/toast'
import { PlayerCountCard } from './filters/PlayerCountCard'
import { VibeCard } from './filters/VibeCard'
import { LayoutToggle } from '../LayoutToggle'
import type { LayoutMode } from '../../services/storage/uiPreferences'

export interface FiltersStepProps {
  games: GameRecord[]
  users: UserRecord[]
  gameOwners: Record<number, string[]>
  layoutMode: LayoutMode
  onLayoutModeChange: (mode: LayoutMode) => void
  sessionUserCount: number
  playerCount: number
  onPlayerCountChange: (count: number) => void
  timeRange: { min: number; max: number }
  onTimeRangeChange: (range: { min: number; max: number }) => void
  mode: 'coop' | 'competitive' | 'any'
  onModeChange: (mode: 'coop' | 'competitive' | 'any') => void
  excludeLowRatedThreshold: number | null
  onExcludeLowRatedChange: (threshold: number | null) => void
  ageRange: { min: number; max: number }
  onAgeRangeChange: (range: { min: number; max: number }) => void
  complexityRange: { min: number; max: number }
  onComplexityRangeChange: (range: { min: number; max: number }) => void
  ratingRange: { min: number; max: number }
  onRatingRangeChange: (range: { min: number; max: number }) => void
  filteredGames: GameRecord[]
  onExcludeGameFromSession: (bggId: number) => void
  onUndoExcludeGameFromSession: (bggId: number) => void
}

const TIME_PRESETS = [
  { label: 'Short', value: { min: 0, max: 30 }, description: '< 30 min' },
  { label: 'Medium', value: { min: 30, max: 90 }, description: '30-90 min' },
  { label: 'Long', value: { min: 90, max: 180 }, description: '90-180 min' },
  { label: 'Any', value: { min: 0, max: 300 }, description: 'No limit' },
]

export function FiltersStep({
  games,
  users,
  gameOwners,
  layoutMode,
  onLayoutModeChange,
  sessionUserCount,
  playerCount,
  onPlayerCountChange,
  timeRange,
  onTimeRangeChange,
  mode,
  onModeChange,
  excludeLowRatedThreshold,
  onExcludeLowRatedChange,
  ageRange,
  onAgeRangeChange,
  complexityRange,
  onComplexityRangeChange,
  ratingRange,
  onRatingRangeChange,
  filteredGames,
  onExcludeGameFromSession,
  onUndoExcludeGameFromSession,
}: FiltersStepProps) {
  const toast = useToast()
  const [detailsGame, setDetailsGame] = useState<GameRecord | null>(null)

  const activeTimePreset = useMemo(() => {
    const preset = TIME_PRESETS.find(
      (p) => p.value.min === timeRange.min && p.value.max === timeRange.max
    )
    return preset?.label ?? 'Custom'
  }, [timeRange])

  const noGamesMatch = filteredGames.length === 0 && games.length > 0

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Box>
        <Typography variant="h5" gutterBottom sx={{ color: 'primary.dark' }}>
          Set your constraints
        </Typography>
        <Typography color="text.secondary">
          Filter games by what works for your group tonight
        </Typography>
      </Box>

      {/* Player Count */}
      <PlayerCountCard
        sessionUserCount={sessionUserCount}
        playerCount={playerCount}
        onPlayerCountChange={onPlayerCountChange}
      />

      {/* Time Range */}
      <Card>
        <CardContent>
          <Stack direction="row" alignItems="center" gap={1} mb={2}>
            <ScheduleIcon color="primary" />
            <Typography variant="subtitle1" fontWeight={600}>
              How much time do you have?
            </Typography>
          </Stack>

          <ToggleButtonGroup
            value={activeTimePreset}
            exclusive
            onChange={(_, label) => {
              const preset = TIME_PRESETS.find((p) => p.label === label)
              if (preset) onTimeRangeChange(preset.value)
            }}
            fullWidth
            sx={{ mb: 2, '& .MuiToggleButton-root': { py: 1, minHeight: 40 } }}
          >
            {TIME_PRESETS.map((preset) => (
              <ToggleButton key={preset.label} value={preset.label}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" fontWeight={600}>
                    {preset.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {preset.description}
                  </Typography>
                </Box>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <Box sx={{ px: 1 }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Fine-tune: {timeRange.min} – {timeRange.max} minutes
            </Typography>
            <Slider
              value={[timeRange.min, timeRange.max]}
              onChange={(_, value) => {
                const [min, max] = value as number[]
                onTimeRangeChange({ min, max })
              }}
              min={0}
              max={300}
              step={15}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${v}m`}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Game Mode */}
      <VibeCard mode={mode} onModeChange={onModeChange} />

      <AdvancedFiltersAccordion
        excludeLowRatedThreshold={excludeLowRatedThreshold}
        onExcludeLowRatedChange={onExcludeLowRatedChange}
        ageRange={ageRange}
        onAgeRangeChange={onAgeRangeChange}
        complexityRange={complexityRange}
        onComplexityRangeChange={onComplexityRangeChange}
        ratingRange={ratingRange}
        onRatingRangeChange={onRatingRangeChange}
      />

      {/* Results Summary */}
      {noGamesMatch ? (
        <Alert severity="warning" sx={{ borderRadius: 3 }}>
          <Typography fontWeight={600}>No games match your filters</Typography>
          <Typography variant="body2">
            Try increasing time, changing player count, or relaxing the game mode preference.
          </Typography>
        </Alert>
      ) : (
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

          {/* Filtered Games Preview */}
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
                  const onExclude = () => {
                    onExcludeGameFromSession(game.bggId)
                    toast.info(`Excluded “${game.name}” from this session`, {
                      autoHideMs: 5500,
                      actionLabel: 'Undo',
                      onAction: () => onUndoExcludeGameFromSession(game.bggId),
                    })
                  }

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
        </>
      )}
    </Stack>
  )
}

function FilteredGameCard(props: { game: GameRecord; onExclude: () => void; onOpenDetails: () => void }) {
  const { game, onExclude, onOpenDetails } = props

  return (
    <GameTile
      game={game}
      onClick={onOpenDetails}
      actions={
        <IconButton
          size="small"
          onClick={onExclude}
          aria-label="Exclude from session"
          sx={{ color: 'error.main' }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      }
    />
  )
}
