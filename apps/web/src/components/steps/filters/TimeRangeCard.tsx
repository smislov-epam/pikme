import { useMemo } from 'react'
import { Box, Card, CardContent, Slider, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import ScheduleIcon from '@mui/icons-material/Schedule'

export interface TimeRange {
  min: number
  max: number
}

export interface TimeRangeCardProps {
  timeRange: TimeRange
  onTimeRangeChange: (range: TimeRange) => void
  disabled?: boolean
}

const TIME_PRESETS: Array<{ label: string; value: TimeRange; description: string }> = [
  { label: 'Short', value: { min: 0, max: 30 }, description: '< 30 min' },
  { label: 'Medium', value: { min: 30, max: 90 }, description: '30-90 min' },
  { label: 'Long', value: { min: 90, max: 180 }, description: '90-180 min' },
  { label: 'Any', value: { min: 0, max: 300 }, description: 'No limit' },
]

export function TimeRangeCard({ timeRange, onTimeRangeChange, disabled = false }: TimeRangeCardProps) {
  const activeTimePreset = useMemo(() => {
    const preset = TIME_PRESETS.find((p) => p.value.min === timeRange.min && p.value.max === timeRange.max)
    return preset?.label ?? 'Custom'
  }, [timeRange])

  return (
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
          disabled={disabled}
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
            disabled={disabled}
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
  )
}
