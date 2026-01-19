import {
  Box,
  Tab,
  Tabs,
  Tooltip,
  Typography,
  Stack,
  IconButton,
  alpha,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import CloudDoneIcon from '@mui/icons-material/CloudDone'
import SyncIcon from '@mui/icons-material/Sync'
import LockIcon from '@mui/icons-material/Lock'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import type { UserRecord } from '../../../db/types'
import type { GuestStatus, UserSyncStatus } from './types'
import { colors } from '../../../theme/theme'

export function PreferencesUserSelector(props: {
  users: UserRecord[]
  selectedUser: string
  isMobile: boolean
  onChange: (username: string) => void
  /** Preferences keyed by username (used to determine in-progress vs chosen states). */
  preferences: Record<string, { bggId: number; rank?: number; isTopPick?: boolean; isDisliked?: boolean }[]>
  /** The game IDs currently visible in this preferences step. */
  gameIds: number[]
  /** Optional guest statuses (for showing ready indicators) */
  guestStatuses?: GuestStatus[]
  /** Usernames that are read-only (cannot be edited) */
  readOnlyUsernames?: string[]
  /** Sync statuses for users in active session */
  syncStatuses?: UserSyncStatus[]
  /** Callback when user clicks sync button */
  onSyncUser?: (username: string) => void
}) {
  const { 
    users, 
    selectedUser, 
    isMobile, 
    onChange, 
    preferences, 
    gameIds, 
    guestStatuses = [], 
    readOnlyUsernames = [],
    syncStatuses = [],
    onSyncUser,
  } = props

  // Create a map of guest statuses
  const statusMap = new Map(guestStatuses.map((g) => [g.username, g]))
  const syncStatusMap = new Map(syncStatuses.map((s) => [s.username, s]))
  const gameIdSet = new Set(gameIds)
  const readOnlySet = new Set(readOnlyUsernames)

  const getChoiceState = (user: UserRecord): 'in-progress' | 'chosen' => {
    // By default the host/organizer is treated as "chosen".
    if (user.isOrganizer) return 'chosen'

    const status = statusMap.get(user.username)
    const isGuest = !!status
    if (isGuest) {
      const hasUpdates = (status?.updatedAt ?? null) !== null
      const isReady = status?.ready ?? false
      return hasUpdates || isReady ? 'chosen' : 'in-progress'
    }

    const userPrefs = preferences[user.username] ?? []
    const hasChoiceForVisibleGames = userPrefs.some((p) => {
      if (!gameIdSet.has(p.bggId)) return false
      return p.rank !== undefined || !!p.isTopPick || !!p.isDisliked
    })

    return hasChoiceForVisibleGames ? 'chosen' : 'in-progress'
  }

  /** Render the status icon based on sync state */
  const renderStatusIcon = (
    user: UserRecord, 
    choiceState: 'in-progress' | 'chosen',
  ) => {
    const syncStatus = syncStatusMap.get(user.username)
    const isGuest = user.username.startsWith('__guest_')
    const iconSize = 18

    // If we have sync status from active session, use that
    if (syncStatus) {
      switch (syncStatus.state) {
        case 'synced':
          // Local user synced - green checkmark
          return (
            <Tooltip title="Preferences synced">
              <CheckCircleIcon sx={{ fontSize: iconSize, color: 'success.main' }} />
            </Tooltip>
          )
        case 'needs-sync':
          // Local user with changes - blue sync arrows (clickable)
          return (
            <Tooltip title="Click to sync changes">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation()
                  onSyncUser?.(user.username)
                }}
                sx={{ 
                  p: 0.25,
                  color: colors.oceanBlue,
                  '&:hover': { bgcolor: alpha(colors.oceanBlue, 0.1) },
                }}
              >
                <SyncIcon sx={{ fontSize: iconSize }} />
              </IconButton>
            </Tooltip>
          )
        case 'syncing':
          // Currently syncing - rotating icon, not clickable
          return (
            <Tooltip title="Syncing...">
              <Box
                sx={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 0.25,
                }}
              >
                <SyncIcon 
                  sx={{ 
                    fontSize: iconSize, 
                    color: colors.oceanBlue,
                    animation: 'spin 1s linear infinite',
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' },
                    },
                  }} 
                />
              </Box>
            </Tooltip>
          )
        case 'remote':
          // Remote guest submitted - green cloud
          return (
            <Tooltip title="Preferences received from guest">
              <CloudDoneIcon sx={{ fontSize: iconSize, color: 'success.main' }} />
            </Tooltip>
          )
        case 'waiting':
          // Waiting for remote guest
          return (
            <Tooltip title="Waiting for preferences">
              <RadioButtonUncheckedIcon sx={{ fontSize: iconSize, color: 'text.secondary' }} />
            </Tooltip>
          )
      }
    }

    // Legacy fallback: Guest users from guestStatuses (no active session sync tracking)
    if (isGuest) {
      const status = statusMap.get(user.username)
      const hasUpdates = (status?.updatedAt ?? null) !== null
      if (hasUpdates) {
        return (
          <Tooltip title="Preferences received from guest">
            <CloudDoneIcon sx={{ fontSize: iconSize, color: 'success.main' }} />
          </Tooltip>
        )
      }
      return (
        <Tooltip title="Waiting for guest preferences">
          <RadioButtonUncheckedIcon sx={{ fontSize: iconSize, color: 'text.secondary' }} />
        </Tooltip>
      )
    }

    // Fallback to legacy choice state (no active session)
    if (choiceState === 'chosen') {
      return <CheckCircleIcon sx={{ fontSize: iconSize, color: 'success.main' }} />
    }
    return <RadioButtonUncheckedIcon sx={{ fontSize: iconSize, color: 'text.secondary' }} />
  }

  if (users.length <= 1) return null

  // Mobile: carousel-style tile with left/right arrows
  if (isMobile) {
    const currentIndex = users.findIndex((u) => u.username === selectedUser)
    const currentUser = users[currentIndex]
    const isReadOnly = readOnlySet.has(currentUser?.username ?? '')
    const choiceState = currentUser ? getChoiceState(currentUser) : 'in-progress'
    const canGoLeft = currentIndex > 0
    const canGoRight = currentIndex < users.length - 1

    const handlePrev = () => {
      if (canGoLeft) {
        onChange(users[currentIndex - 1].username)
      }
    }

    const handleNext = () => {
      if (canGoRight) {
        onChange(users[currentIndex + 1].username)
      }
    }

    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          bgcolor: 'background.paper',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          p: 0.5,
        }}
      >
        {/* Left arrow */}
        <IconButton
          size="small"
          onClick={handlePrev}
          disabled={!canGoLeft}
          sx={{ 
            color: canGoLeft ? 'text.primary' : 'text.disabled',
            p: 0.5,
          }}
        >
          <ChevronLeftIcon />
        </IconButton>

        {/* Center: user tile */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 40,
            px: 1,
          }}
        >
          <Stack direction="row" spacing={0.75} alignItems="center">
            {currentUser && renderStatusIcon(currentUser, choiceState)}
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {currentUser?.displayName || currentUser?.username}
            </Typography>
            {isReadOnly && (
              <Tooltip title="View only">
                <LockIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
              </Tooltip>
            )}
          </Stack>
          {/* User position indicator */}
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            {currentIndex + 1}/{users.length}
          </Typography>
        </Box>

        {/* Right arrow */}
        <IconButton
          size="small"
          onClick={handleNext}
          disabled={!canGoRight}
          sx={{ 
            color: canGoRight ? 'text.primary' : 'text.disabled',
            p: 0.5,
          }}
        >
          <ChevronRightIcon />
        </IconButton>
      </Box>
    )
  }

  return (
    <Tabs
      value={selectedUser}
      onChange={(_, v) => onChange(String(v))}
      variant="scrollable"
      scrollButtons="auto"
      TabIndicatorProps={{
        sx: {
          bgcolor: colors.oceanBlue,
          height: 3,
          bottom: 0,
        },
      }}
      sx={{
        bgcolor: alpha(colors.skyBlue, 0.08),
        borderRadius: 2,
        border: `1px solid ${alpha(colors.oceanBlue, 0.15)}`,
        minHeight: 44,
        '& .MuiTabs-flexContainer': {
          gap: 0.5,
        },
        '& .MuiTab-root': {
          minHeight: 44,
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.85rem',
          color: colors.navyBlue,
          px: 1.5,
          '&.Mui-selected': {
            color: colors.oceanBlue,
            fontWeight: 600,
            bgcolor: alpha(colors.oceanBlue, 0.06),
          },
          '&:hover': {
            bgcolor: alpha(colors.oceanBlue, 0.04),
          },
        },
      }}
    >
      {users.map((user) => {
        const isReadOnly = readOnlySet.has(user.username)
        const choiceState = getChoiceState(user)

        const label = (
          <Stack direction="row" spacing={0.75} alignItems="center">
            {renderStatusIcon(user, choiceState)}
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {user.displayName || user.username}
            </Typography>
            {isReadOnly && (
              <Tooltip title="View only - you cannot edit this user's preferences">
                <LockIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
              </Tooltip>
            )}
          </Stack>
        )

        return (
          <Tab
            key={user.username}
            value={user.username}
            label={label}
            sx={{ '& .MuiTab-iconWrapper': { mr: 0 } }}
          />
        )
      })}
    </Tabs>
  )
}
