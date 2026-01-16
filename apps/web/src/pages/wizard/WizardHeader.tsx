import { useState } from 'react'
import {
  AppBar,
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material'
import SettingsIcon from '@mui/icons-material/Settings'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import BackupIcon from '@mui/icons-material/Backup'
import PersonIcon from '@mui/icons-material/Person'
import LoginIcon from '@mui/icons-material/Login'
import LogoutIcon from '@mui/icons-material/Logout'
import { colors } from '../../theme/theme'
import { useAuth } from '../../hooks/useAuth'

export function WizardHeader(props: {
  onOpenClearDialog: () => void
  onOpenBackup: () => void
  onOpenSettings: () => void
  onOpenHelp: () => void
}) {
  const { onOpenClearDialog, onOpenBackup, onOpenSettings, onOpenHelp } = props
  const { user, firebaseReady, signOut } = useAuth()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  // Show user is authenticated
  const isLoggedIn = firebaseReady && user !== null
  const userEmail = user?.email ?? ''
  const userName = user?.displayName || userEmail.split('@')[0] || 'User'

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleUserMenuClose = () => {
    setAnchorEl(null)
  }

  const handleSignOut = async () => {
    handleUserMenuClose()
    await signOut()
  }

  const handleSignIn = () => {
    // Navigate to a simple sign-in flow
    window.location.href = '/login'
  }

  const iconButtonSx = {
    width: 40,
    height: 40,
    borderRadius: 2,
    color: isLoggedIn ? 'white' : 'text.secondary',
    '&:hover': { bgcolor: isLoggedIn ? alpha('#fff', 0.15) : 'action.hover' },
  } as const

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: isLoggedIn ? colors.oceanBlue : alpha(colors.warmWhite, 0.95),
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid',
        borderColor: isLoggedIn ? alpha('#fff', 0.2) : 'divider',
        transition: 'background-color 0.3s ease',
      }}
    >
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: isLoggedIn ? alpha('#fff', 0.2) : colors.oceanBlue,
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
              color: isLoggedIn ? 'white' : 'primary.dark',
              letterSpacing: '-0.02em',
            }}
          >
            PIKME
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Tooltip title="Clear all data">
          <IconButton onClick={onOpenClearDialog} sx={{ ...iconButtonSx, color: isLoggedIn ? '#ffcdd2' : '#d32f2f' }}>
            <DeleteForeverIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Backup & Restore">
          <IconButton onClick={onOpenBackup} sx={{ ...iconButtonSx, color: isLoggedIn ? '#fff59d' : '#f9a825' }}>
            <BackupIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Settings">
          <IconButton onClick={onOpenSettings} sx={{ ...iconButtonSx, color: isLoggedIn ? '#90caf9' : '#1976d2' }}>
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Help">
          <IconButton aria-label="Help" onClick={onOpenHelp} sx={{ ...iconButtonSx, color: isLoggedIn ? '#c5e1a5' : '#388e3c' }}>
            <InfoOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* User menu / Sign in - far right */}
        {isLoggedIn ? (
          <>
            <Tooltip title={userEmail}>
              <Chip
                icon={<PersonIcon sx={{ color: 'white !important' }} />}
                label={userName}
                onClick={handleUserMenuOpen}
                size="small"
                sx={{
                  ml: 0.5,
                  bgcolor: alpha('#fff', 0.2),
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                  '& .MuiChip-icon': { color: 'white' },
                  '&:hover': { bgcolor: alpha('#fff', 0.3) },
                }}
              />
            </Tooltip>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleUserMenuClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem disabled sx={{ opacity: 1, fontWeight: 600 }}>
                {userEmail}
              </MenuItem>
              <MenuItem onClick={handleSignOut}>
                <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
                Sign Out
              </MenuItem>
            </Menu>
          </>
        ) : firebaseReady ? (
          <Tooltip title="Sign In">
            <IconButton onClick={handleSignIn} sx={iconButtonSx}>
              <LoginIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null}
      </Toolbar>
    </AppBar>
  )
}
