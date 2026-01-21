import { Box, Chip, type ChipProps, useMediaQuery } from '@mui/material'

interface ConfidenceBadgeProps {
  confidence: 'high' | 'medium' | 'low'
  size?: 'small' | 'medium'
}

const CONFIDENCE_CONFIG: Record<
  'high' | 'medium' | 'low',
  { label: string; shortLabel: string; color: ChipProps['color']; bgColor: string }
> = {
  high: { label: 'High', shortLabel: 'H', color: 'success', bgColor: 'success.main' },
  medium: { label: 'Medium', shortLabel: 'M', color: 'warning', bgColor: 'warning.main' },
  low: { label: 'Low', shortLabel: 'L', color: 'error', bgColor: 'error.main' },
}

export function ConfidenceBadge({ confidence, size = 'small' }: ConfidenceBadgeProps) {
  const config = CONFIDENCE_CONFIG[confidence]
  const isMobile = useMediaQuery('(max-width:600px)')

  // On mobile, show compact circle with letter
  if (isMobile) {
    return (
      <Box
        sx={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          bgcolor: config.bgColor,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.7rem',
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {config.shortLabel}
      </Box>
    )
  }

  return (
    <Chip
      label={config.label}
      color={config.color}
      size={size}
      sx={{ fontWeight: 500, fontSize: size === 'small' ? '0.7rem' : '0.8rem' }}
    />
  )
}
