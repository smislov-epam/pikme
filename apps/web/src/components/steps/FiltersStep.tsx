import { useMemo } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Slider,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CloseIcon from '@mui/icons-material/Close'
import GroupsIcon from '@mui/icons-material/Groups'
import ScheduleIcon from '@mui/icons-material/Schedule'
import PsychologyIcon from '@mui/icons-material/Psychology'
import type { GameRecord } from '../../db/types'
import { AdvancedFiltersAccordion } from './AdvancedFiltersAccordion'
import { GameTile } from './GameTile'
import { useToast } from '../../services/toast'

export interface FiltersStepProps {
  games: GameRecord[]
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
  { label: 'Long', value: { min: 90, max: 300 }, description: '90+ min' },
  { label: 'Any', value: { min: 0, max: 300 }, description: 'No limit' },
]

const PLAYER_COUNTS = [2, 3, 4, 5, 6, 7, 8, 9, 10]

export function FiltersStep({
  games,
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
      <Card>
        <CardContent>
          <Stack direction="row" alignItems="center" gap={1} mb={2}>
            <GroupsIcon color="primary" />
            <Typography variant="subtitle1" fontWeight={600}>
              How many players?
            </Typography>
          </Stack>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {PLAYER_COUNTS.map((count) => (
              <Chip
                key={count}
                label={count}
                onClick={() => onPlayerCountChange(count)}
                variant={playerCount === count ? 'filled' : 'outlined'}
                color={playerCount === count ? 'primary' : 'default'}
                sx={{
                  minWidth: 44,
                  fontWeight: 600,
                  fontSize: '1rem',
                }}
              />
            ))}
          </Box>
        </CardContent>
      </Card>

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
            sx={{ mb: 2 }}
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
      <Card>
        <CardContent>
          <Stack direction="row" alignItems="center" gap={1} mb={2}>
            <PsychologyIcon color="primary" />
            <Typography variant="subtitle1" fontWeight={600}>
              What's the vibe?
            </Typography>
          </Stack>

          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(_, v) => v && onModeChange(v)}
            fullWidth
          >
            <ToggleButton value="coop">
              <Box sx={{ textAlign: 'center', py: 0.5 }}>
                <Typography fontWeight={600}>🤝 Coop</Typography>
                <Typography variant="caption" color="text.secondary">
                  Work together
                </Typography>
              </Box>
            </ToggleButton>
            <ToggleButton value="competitive">
              <Box sx={{ textAlign: 'center', py: 0.5 }}>
                <Typography fontWeight={600}>⚔️ Competitive</Typography>
                <Typography variant="caption" color="text.secondary">
                  Every player for themselves
                </Typography>
              </Box>
            </ToggleButton>
            <ToggleButton value="any">
              <Box sx={{ textAlign: 'center', py: 0.5 }}>
                <Typography fontWeight={600}>🎲 Any</Typography>
                <Typography variant="caption" color="text.secondary">
                  No preference
                </Typography>
              </Box>
            </ToggleButton>
          </ToggleButtonGroup>
        </CardContent>
      </Card>

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
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight={500}>Preview matching games</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={1}>
                {filteredGames.slice(0, 10).map((game) => (
                  <FilteredGameCard
                    key={game.bggId}
                    game={game}
                    onExclude={() => {
                      onExcludeGameFromSession(game.bggId)
                      toast.info(`Excluded “${game.name}” from this session`, {
                        autoHideMs: 5500,
                        actionLabel: 'Undo',
                        onAction: () => onUndoExcludeGameFromSession(game.bggId),
                      })
                    }}
                  />
                ))}
                {filteredGames.length > 10 && (
                  <Typography variant="caption" color="text.secondary" sx={{ pt: 1, textAlign: 'center' }}>
                    +{filteredGames.length - 10} more games
                  </Typography>
                )}
              </Stack>
            </AccordionDetails>
          </Accordion>
        </>
      )}
    </Stack>
  )
}

function FilteredGameCard(props: { game: GameRecord; onExclude: () => void }) {
  const { game, onExclude } = props

  return (
    <GameTile
      game={game}
      actions={
        <IconButton
          size="small"
          onClick={onExclude}
          aria-label="Exclude from session"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      }
    />
  )
}
