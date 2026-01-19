import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  FormControlLabel,
  Slider,
  Stack,
  Switch,
  Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import StarIcon from '@mui/icons-material/Star'

export interface AdvancedFiltersAccordionProps {
  playerCount: number
  requireBestWithPlayerCount: boolean
  onRequireBestWithPlayerCountChange: (enabled: boolean) => void

  excludeLowRatedThreshold: number | null
  onExcludeLowRatedChange: (threshold: number | null) => void

  ageRange: { min: number; max: number }
  onAgeRangeChange: (range: { min: number; max: number }) => void

  complexityRange: { min: number; max: number }
  onComplexityRangeChange: (range: { min: number; max: number }) => void

  ratingRange: { min: number; max: number }
  onRatingRangeChange: (range: { min: number; max: number }) => void

  disabled?: boolean
}

export function AdvancedFiltersAccordion({
  playerCount,
  requireBestWithPlayerCount,
  onRequireBestWithPlayerCountChange,
  excludeLowRatedThreshold,
  onExcludeLowRatedChange,
  ageRange,
  onAgeRangeChange,
  complexityRange,
  onComplexityRangeChange,
  ratingRange,
  onRatingRangeChange,
  disabled = false,
}: AdvancedFiltersAccordionProps) {
  return (
    <Accordion
      sx={{
        bgcolor: 'background.paper',
        borderRadius: '20px !important',
        '&:before': { display: 'none' },
        boxShadow: (theme) => theme.shadows[1],
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" alignItems="center" gap={1}>
          <StarIcon color="action" />
          <Typography fontWeight={500}>Advanced filters</Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <FormControlLabel
          control={
            <Switch
              checked={requireBestWithPlayerCount}
              disabled={disabled}
              onChange={(_, checked) => onRequireBestWithPlayerCountChange(checked)}
            />
          }
          label={`Only games “best with ${playerCount}”`}
          sx={{ mb: 1 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
          Uses the game’s “Best with” field (BGG poll-summary / import). Games without that info are hidden.
        </Typography>

        {/* Player ratings exclusion */}
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Exclude games rated below this threshold by any player
        </Typography>
        <Box sx={{ px: 1, mt: 2, mb: 3 }}>
          <Slider
            value={excludeLowRatedThreshold ?? 0}
            disabled={disabled}
            onChange={(_, v) => onExcludeLowRatedChange((v as number) || null)}
            min={0}
            max={10}
            step={0.5}
            marks={[
              { value: 0, label: 'Off' },
              { value: 5, label: '5' },
              { value: 7, label: '7' },
              { value: 10, label: '10' },
            ]}
            valueLabelDisplay="auto"
          />
        </Box>

        {/* Min age */}
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Minimum age (years): {ageRange.min} – {ageRange.max}
        </Typography>
        <Box sx={{ px: 1, mt: 2, mb: 3 }}>
          <Slider
            value={[ageRange.min, ageRange.max]}
            disabled={disabled}
            onChange={(_, value) => {
              const [min, max] = value as number[]
              onAgeRangeChange({ min, max })
            }}
            min={0}
            max={21}
            step={1}
            marks={[
              { value: 0, label: '0' },
              { value: 8, label: '8' },
              { value: 12, label: '12' },
              { value: 14, label: '14' },
              { value: 18, label: '18' },
              { value: 21, label: '21' },
            ]}
            valueLabelDisplay="auto"
          />
        </Box>

        {/* Complexity */}
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Complexity / weight: {complexityRange.min.toFixed(1)} – {complexityRange.max.toFixed(1)}
        </Typography>
        <Box sx={{ px: 1, mt: 2, mb: 3 }}>
          <Slider
            value={[complexityRange.min, complexityRange.max]}
            disabled={disabled}
            onChange={(_, value) => {
              const [min, max] = value as number[]
              onComplexityRangeChange({ min, max })
            }}
            min={0}
            max={5}
            step={0.5}
            marks={[
              { value: 0, label: '0' },
              { value: 1, label: '1' },
              { value: 2.5, label: '2.5' },
              { value: 5, label: '5' },
            ]}
            valueLabelDisplay="auto"
          />
        </Box>

        {/* Average rating */}
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Average rating: {ratingRange.min.toFixed(1)} – {ratingRange.max.toFixed(1)}
        </Typography>
        <Box sx={{ px: 1, mt: 2 }}>
          <Slider
            value={[ratingRange.min, ratingRange.max]}
            disabled={disabled}
            onChange={(_, value) => {
              const [min, max] = value as number[]
              onRatingRangeChange({ min, max })
            }}
            min={0}
            max={10}
            step={0.5}
            marks={[
              { value: 0, label: '0' },
              { value: 6, label: '6' },
              { value: 8, label: '8' },
              { value: 10, label: '10' },
            ]}
            valueLabelDisplay="auto"
          />
        </Box>
      </AccordionDetails>
    </Accordion>
  )
}
