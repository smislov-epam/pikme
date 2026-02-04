/**
 * App Header User Menu Component
 *
 * Dropdown menu for authenticated users showing user info and actions.
 * Extracted from AppHeader for file size compliance.
 */

import {
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  alpha,
} from '@mui/material'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import BackupIcon from '@mui/icons-material/Backup'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import LogoutIcon from '@mui/icons-material/Logout'
import PersonIcon from '@mui/icons-material/Person'
import { colors } from '../theme/theme'

export interface AppHeaderUserMenuProps {
  /** User's email address */
  userEmail: string
  /** User's display name */
  userName: string
  /** Whether user is an admin */
  isAdmin: boolean
  /** Whether currently on admin page */
  isOnAdminPage: boolean
  /** Whether to show mobile-only menu items */
  isMobile: boolean
  /** Menu anchor element */
  anchorEl: HTMLElement | null
  /** Icon button style */
  iconButtonSx: object
  /** Callback to open menu */
  onMenuOpen: (event: React.MouseEvent<HTMLElement>) => void
  /** Callback to close menu */
  onMenuClose: () => void
  /** Callback to sign out */
  onSignOut: () => void
  /** Callback to navigate to admin */
  onNavigateAdmin: () => void
  /** Callback to open backup dialog */
  onOpenBackup?: () => void
  /** Callback to open clear data dialog */
  onOpenClearDialog?: () => void
}

export function AppHeaderUserMenu({
  userEmail,
  userName,
  isAdmin,
  isOnAdminPage,
  isMobile,
  anchorEl,
  iconButtonSx,
  onMenuOpen,
  onMenuClose,
  onSignOut,
  onNavigateAdmin,
  onOpenBackup,
  onOpenClearDialog,
}: AppHeaderUserMenuProps) {
  return (
    <>
      <Tooltip title={userEmail}>
        <IconButton
          onClick={onMenuOpen}
          sx={{
            ...iconButtonSx,
            ml: 0.5,
            bgcolor: alpha('#fff', 0.2),
            '&:hover': { bgcolor: alpha('#fff', 0.3) },
          }}
        >
          <AccountCircleIcon sx={{ color: 'white' }} />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={onMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {/* User info */}
        <MenuItem disabled sx={{ opacity: 1 }}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary={userName}
            secondary={userEmail}
            primaryTypographyProps={{ fontWeight: 600 }}
            secondaryTypographyProps={{ fontSize: '0.75rem' }}
          />
        </MenuItem>

        {/* Mobile-only: Backup */}
        {isMobile && onOpenBackup && (
          <MenuItem
            onClick={() => {
              onMenuClose()
              onOpenBackup()
            }}
          >
            <ListItemIcon>
              <BackupIcon fontSize="small" sx={{ color: '#f9a825' }} />
            </ListItemIcon>
            <ListItemText primary="Backup & Restore" />
          </MenuItem>
        )}

        {/* Mobile-only: Clear data */}
        {isMobile && onOpenClearDialog && (
          <MenuItem
            onClick={() => {
              onMenuClose()
              onOpenClearDialog()
            }}
          >
            <ListItemIcon>
              <DeleteForeverIcon fontSize="small" sx={{ color: '#d32f2f' }} />
            </ListItemIcon>
            <ListItemText primary="Clear All Data" />
          </MenuItem>
        )}

        {/* Admin Panel - only show if admin and not already on admin page */}
        {isAdmin && !isOnAdminPage && (
          <MenuItem
            onClick={() => {
              onMenuClose()
              onNavigateAdmin()
            }}
          >
            <ListItemIcon>
              <AdminPanelSettingsIcon fontSize="small" sx={{ color: colors.oceanBlue }} />
            </ListItemIcon>
            <ListItemText primary="Admin Panel" />
          </MenuItem>
        )}

        {/* Sign Out */}
        <MenuItem onClick={onSignOut}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Sign Out" />
        </MenuItem>
      </Menu>
    </>
  )
}
