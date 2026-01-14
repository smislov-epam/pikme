import type { ReactElement } from 'react'
import type { SxProps, Theme } from '@mui/material/styles'
import { Chip } from '@mui/material'

export function StatPill(props: {
  label: string
  icon?: ReactElement
  sx?: SxProps<Theme>
}) {
  const { label, icon, sx } = props

  return (
    <Chip
      icon={icon}
      label={label}
      size="small"
      sx={{
        height: 22,
        borderRadius: 10,
        fontSize: '0.72rem',
        fontWeight: 700,
        bgcolor: 'secondary.main',
        color: 'secondary.contrastText',
        '& .MuiChip-icon': {
          color: 'secondary.contrastText',
          fontSize: 16,
        },
        ...sx,
      }}
    />
  )
}
