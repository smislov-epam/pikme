import {
  FormControl,
  MenuItem,
  Select,
  Tab,
  Tabs,
  Tooltip,
  Typography,
  Stack,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import CloudIcon from '@mui/icons-material/Cloud'
import type { UserRecord } from '../../../db/types'
import type { GuestStatus } from './types'

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
}) {
  const { users, selectedUser, isMobile, onChange, preferences, gameIds, guestStatuses = [] } = props

  // Create a map of guest statuses
  const statusMap = new Map(guestStatuses.map((g) => [g.username, g]))
  const gameIdSet = new Set(gameIds)

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

  const renderStatusIcon = (state: 'in-progress' | 'chosen', color: string) => {
    if (state === 'chosen') {
      return <CheckCircleIcon sx={{ fontSize: 18, color }} />
    }
    return <RadioButtonUncheckedIcon sx={{ fontSize: 18, color }} />
  }

  if (users.length <= 1) return null

  if (isMobile) {
    return (
      <FormControl fullWidth>
        <Select
          size="small"
          value={selectedUser}
          onChange={(e) => onChange(String(e.target.value))}
          sx={{ bgcolor: 'background.default', height: 40 }}
        >
          {users.map((user) => {
            const status = statusMap.get(user.username)
            const isGuest = !!status
            const choiceState = getChoiceState(user)
            const tone = choiceState === 'chosen' ? 'success.main' : 'primary.main'

            return (
              <MenuItem key={user.username} value={user.username}>
                <Stack direction="row" spacing={1} alignItems="center">
                  {renderStatusIcon(choiceState, tone)}
                  <Typography variant="body2" sx={{ color: tone }}>
                    {user.displayName || user.username}
                  </Typography>
                  {isGuest && (
                    <CloudIcon sx={{ fontSize: 16, color: tone, opacity: 0.9 }} />
                  )}
                </Stack>
              </MenuItem>
            )
          })}
        </Select>
      </FormControl>
    )
  }

  return (
    <Tabs
      value={selectedUser}
      onChange={(_, v) => onChange(String(v))}
      variant="scrollable"
      scrollButtons="auto"
      sx={{
        // Folder-tab style: tabs are the surfaces, not the container.
        bgcolor: 'transparent',
        borderBottom: '1px solid',
        borderColor: 'divider',
        '& .MuiTab-root': {
          textTransform: 'none',
          fontWeight: 500,
          minHeight: 40,
        },
        '& .MuiTabs-indicator': {
          display: 'none',
        },
      }}
    >
      {users.map((user) => {
        const status = statusMap.get(user.username)
        const isGuest = !!status
        const isReady = status?.ready ?? false
        const hasUpdates = (status?.updatedAt ?? null) !== null
        const choiceState = getChoiceState(user)

        const tone = choiceState === 'chosen' ? 'success.main' : 'primary.main'

        const label = (
          <Stack direction="row" spacing={1} alignItems="center">
            {renderStatusIcon(choiceState, tone)}
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {user.displayName || user.username}
            </Typography>
            {isGuest && (
              <Tooltip
                title={
                  hasUpdates
                    ? 'Guest (Preferences received)'
                    : isReady
                      ? 'Guest (Ready)'
                      : 'Guest (Joining)'
                }
              >
                <CloudIcon sx={{ fontSize: 16, color: tone, opacity: 0.9 }} />
              </Tooltip>
            )}
          </Stack>
        )

        return (
          <Tab
            key={user.username}
            value={user.username}
            label={label}
            sx={{
              minHeight: 40,
              px: 1.5,
              py: 0.5,
              borderTopLeftRadius: 10,
              borderTopRightRadius: 10,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              border: '1px solid',
              borderColor: 'divider',
              borderBottom: 0,
              mr: 0.5,
              bgcolor: 'background.default',
              color: 'text.primary',
              '&.Mui-selected': {
                bgcolor: 'background.default',
                color: 'text.primary',
                borderColor: tone,
                zIndex: 1,
              },
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          />
        )
      })}
    </Tabs>
  )
}
