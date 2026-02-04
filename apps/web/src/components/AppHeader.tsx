/**
 * App Header Component
 *
 * Global navigation header used across all pages.
 * Provides consistent branding, navigation, and user menu.
 */

import { useState } from 'react'
import {
  AppBar,
  Badge,
  Box,
  Container,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import SettingsIcon from '@mui/icons-material/Settings'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import BackupIcon from '@mui/icons-material/Backup'
import LoginIcon from '@mui/icons-material/Login'
import EventNoteIcon from '@mui/icons-material/EventNote'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import HomeIcon from '@mui/icons-material/Home'
import { colors } from '../theme/theme'
import { useAuth } from '../hooks/useAuth'
import { useAdminStatus } from '../hooks/useAdminStatus'
import { useNavigate, useLocation } from 'react-router-dom'
import { AppHeaderUserMenu } from './AppHeaderUserMenu'

export interface AppHeaderProps {
  /** Callback to open clear data dialog */
  onOpenClearDialog?: () => void
  /** Callback to open backup/restore dialog */
  onOpenBackup?: () => void
  /** Callback to open settings/API dialog */
  onOpenSettings?: () => void
  /** Callback to open help dialog */
  onOpenHelp?: () => void
  /** Callback to open photo recognition */
  onOpenPhotoRecognition?: () => void
  /** Force blue header chrome even when not authenticated */
  variant?: 'auto' | 'blue'
  /** Number of active sessions for badge */
  activeSessionCount?: number
  /** Callback when sessions icon is clicked */
  onOpenSessions?: () => void
}

export function AppHeader(props: AppHeaderProps) {
  const {
    onOpenClearDialog,
    onOpenBackup,
    onOpenSettings,
    onOpenHelp,
    onOpenPhotoRecognition,
    variant = 'auto',
    activeSessionCount = 0,
    onOpenSessions,
  } = props

  const { user, firebaseReady, signOut } = useAuth()
  const { isAdmin } = useAdminStatus()
  const navigate = useNavigate()
  const location = useLocation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  // Determine current page context
  const isOnAdminPage = location.pathname === '/admin'
  const isOnHomePage = location.pathname === '/'

  // Show user is authenticated
  const isLoggedIn = firebaseReady && user !== null
  const useBlueChrome = variant === 'blue' || isLoggedIn
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
    navigate('/login')
  }

  const handleNavigateHome = () => {
    navigate('/')
  }

  const iconButtonSx = {
    width: 40,
    height: 40,
    borderRadius: 2,
    color: useBlueChrome ? 'white' : 'text.secondary',
    '&:hover': { bgcolor: useBlueChrome ? alpha('#fff', 0.15) : 'action.hover' },
  } as const

  // Icon color helper - uses semantic colors based on login state
  const getIconColor = (loggedInColor: string, defaultColor: string) =>
    isLoggedIn ? loggedInColor : defaultColor

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: useBlueChrome ? colors.oceanBlue : alpha(colors.warmWhite, 0.95),
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid',
        borderColor: useBlueChrome ? alpha('#fff', 0.2) : 'divider',
        transition: 'background-color 0.3s ease',
      }}
    >
      <Container maxWidth="md" sx={{ maxWidth: { lg: 1120 }, px: { xs: 2, sm: 3 } }}>
        <Toolbar disableGutters>
          {/* Logo - clickable to go home */}
          <Box
            onClick={handleNavigateHome}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              cursor: 'pointer',
              '&:hover': { opacity: 0.85 },
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                bgcolor: useBlueChrome ? alpha('#fff', 0.2) : colors.oceanBlue,
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
                color: useBlueChrome ? 'white' : 'primary.dark',
                letterSpacing: '-0.02em',
              }}
            >
              PIKME
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          {/* Home button - show when not on home page and no sessions callback */}
          {!isOnHomePage && !onOpenSessions && (
            <Tooltip title="Home">
              <IconButton
                aria-label="Home"
                onClick={handleNavigateHome}
                sx={{
                  ...iconButtonSx,
                  color: useBlueChrome ? 'white' : colors.oceanBlue,
                }}
              >
                <HomeIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {/* Sessions icon with badge */}
          {onOpenSessions && (
            <Tooltip
              title={
                activeSessionCount > 0
                  ? `${activeSessionCount} active session${activeSessionCount > 1 ? 's' : ''}`
                  : 'My Sessions'
              }
            >
              <IconButton
                aria-label="Sessions"
                onClick={onOpenSessions}
                sx={{
                  ...iconButtonSx,
                  color: useBlueChrome ? 'white' : colors.oceanBlue,
                }}
              >
                <Badge
                  badgeContent={activeSessionCount}
                  color="error"
                  max={9}
                  sx={{
                    '& .MuiBadge-badge': {
                      fontSize: '0.65rem',
                      minWidth: 16,
                      height: 16,
                      padding: '0 4px',
                    },
                  }}
                >
                  <EventNoteIcon fontSize="small" />
                </Badge>
              </IconButton>
            </Tooltip>
          )}

          {/* Photo Recognition */}
          {onOpenPhotoRecognition && (
            <Tooltip title="Photo Recognition">
              <IconButton
                aria-label="Photo Recognition"
                onClick={onOpenPhotoRecognition}
                sx={{ ...iconButtonSx, color: getIconColor('#ce93d8', '#9c27b0') }}
              >
                <CameraAltIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {/* Clear data - hide on mobile */}
          {!isMobile && onOpenClearDialog && (
            <Tooltip title="Clear all data">
              <IconButton
                onClick={onOpenClearDialog}
                sx={{ ...iconButtonSx, color: getIconColor('#ffcdd2', '#d32f2f') }}
              >
                <DeleteForeverIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {/* Backup - hide on mobile */}
          {!isMobile && onOpenBackup && (
            <Tooltip title="Backup & Restore">
              <IconButton
                onClick={onOpenBackup}
                sx={{ ...iconButtonSx, color: getIconColor('#fff59d', '#f9a825') }}
              >
                <BackupIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {/* Settings */}
          {onOpenSettings && (
            <Tooltip title="Settings">
              <IconButton
                onClick={onOpenSettings}
                sx={{ ...iconButtonSx, color: getIconColor('#90caf9', '#1976d2') }}
              >
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {/* Help */}
          {onOpenHelp && (
            <Tooltip title="Help">
              <IconButton
                aria-label="Help"
                onClick={onOpenHelp}
                sx={{ ...iconButtonSx, color: getIconColor('#c5e1a5', '#388e3c') }}
              >
                <InfoOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {/* User menu / Sign in */}
          {isLoggedIn ? (
            <AppHeaderUserMenu
              userEmail={userEmail}
              userName={userName}
              isAdmin={isAdmin}
              isOnAdminPage={isOnAdminPage}
              isMobile={isMobile}
              anchorEl={anchorEl}
              iconButtonSx={iconButtonSx}
              onMenuOpen={handleUserMenuOpen}
              onMenuClose={handleUserMenuClose}
              onSignOut={handleSignOut}
              onNavigateAdmin={() => navigate('/admin')}
              onOpenBackup={onOpenBackup}
              onOpenClearDialog={onOpenClearDialog}
            />
          ) : firebaseReady ? (
            <Tooltip title="Sign In">
              <IconButton onClick={handleSignIn} sx={iconButtonSx}>
                <LoginIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
        </Toolbar>
      </Container>
    </AppBar>
  )
}

// Re-export as WizardHeader for backward compatibility during migration
export { AppHeader as WizardHeader }
