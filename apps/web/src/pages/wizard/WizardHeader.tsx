import {
  AppBar,
  Box,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material'
import SettingsIcon from '@mui/icons-material/Settings'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import BackupIcon from '@mui/icons-material/Backup'
import { colors } from '../../theme/theme'

export function WizardHeader(props: {
  onOpenClearDialog: () => void
  onOpenBackup: () => void
  onOpenSettings: () => void
  onOpenHelp: () => void
}) {
  const { onOpenClearDialog, onOpenBackup, onOpenSettings, onOpenHelp } = props

  const iconButtonSx = {
    width: 40,
    height: 40,
    borderRadius: 2,
    color: 'text.secondary',
    '&:hover': { bgcolor: 'action.hover' },
  } as const

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: alpha(colors.warmWhite, 0.95),
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: colors.oceanBlue,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '1.25rem',
            }}
          >
            🎲
          </Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: 'primary.dark',
              letterSpacing: '-0.02em',
            }}
          >
            PIKME
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Tooltip title="Clear all data">
          <IconButton onClick={onOpenClearDialog} sx={{ ...iconButtonSx, color: 'error.main' }}>
            <DeleteForeverIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Backup & Restore">
          <IconButton onClick={onOpenBackup} sx={{ ...iconButtonSx, color: 'primary.main' }}>
            <BackupIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Settings">
          <IconButton onClick={onOpenSettings} sx={{ ...iconButtonSx, color: 'primary.main' }}>
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Help">
          <IconButton aria-label="Help" onClick={onOpenHelp} sx={{ ...iconButtonSx, color: 'info.main' }}>
            <InfoOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  )
}
