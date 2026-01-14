import { Button, IconButton, Tooltip, useMediaQuery, useTheme } from '@mui/material'
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda'
import ViewStreamIcon from '@mui/icons-material/ViewStream'
import type { LayoutMode } from '../services/storage/uiPreferences'

export function LayoutToggle(props: {
  layoutMode: LayoutMode
  onChange: (mode: LayoutMode) => void
  variant?: 'auto' | 'icon' | 'button'
}) {
  const { layoutMode, onChange, variant = 'auto' } = props
  const theme = useTheme()
  const isNarrow = useMediaQuery(theme.breakpoints.down('sm'))

  const next: LayoutMode = layoutMode === 'standard' ? 'simplified' : 'standard'
  const label = `Layout: ${layoutMode === 'standard' ? 'Standard' : 'Simplified'}`

  const icon = layoutMode === 'standard' ? <ViewAgendaIcon fontSize="small" /> : <ViewStreamIcon fontSize="small" />

  if (variant === 'icon' || (variant === 'auto' && isNarrow)) {
    return (
      <Tooltip title={label}>
        <IconButton
          aria-label={label}
          onClick={() => onChange(next)}
          sx={{ width: 44, height: 44 }}
        >
          {icon}
        </IconButton>
      </Tooltip>
    )
  }

  if (variant === 'button') {
    return (
      <Tooltip title={label}>
        <Button
          size="small"
          variant="outlined"
          startIcon={icon}
          onClick={() => onChange(next)}
          sx={{ height: 36, textTransform: 'none', borderRadius: 2 }}
        >
          Layout
        </Button>
      </Tooltip>
    )
  }

  return (
    <Tooltip title={label}>
      <Button
        size="small"
        variant="outlined"
        startIcon={icon}
        onClick={() => onChange(next)}
        sx={{ height: 36, textTransform: 'none', borderRadius: 2 }}
      >
        Layout
      </Button>
    </Tooltip>
  )
}
