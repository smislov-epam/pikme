import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
  Chip,
  Alert,
} from '@mui/material'
import PersonIcon from '@mui/icons-material/Person'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import type { BackupUserInfo, UserMapping } from '../../services/backup'
import type { UserRecord } from '../../db/types'

interface UserMappingPanelProps {
  mode: 'replace' | 'merge'
  backupUsers: BackupUserInfo[]
  localUsers: UserRecord[]
  mapping: UserMapping
  onMappingChange: (mapping: UserMapping) => void
  /** Current user's username (for Replace mode) */
  currentUsername?: string
}

/**
 * Panel for mapping backup users to local users during import.
 * 
 * Replace mode: "Which backup user is you?" - maps current user to a backup user
 * Merge mode: "Map backup users to existing local users" - maps backup users to local users
 */
export function UserMappingPanel(props: UserMappingPanelProps) {
  const { mode, backupUsers, localUsers, mapping, onMappingChange, currentUsername } = props

  if (backupUsers.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No users found in backup.
      </Typography>
    )
  }

  if (mode === 'replace') {
    return (
      <ReplaceModePanel
        backupUsers={backupUsers}
        mapping={mapping}
        onMappingChange={onMappingChange}
        currentUsername={currentUsername}
      />
    )
  }

  return (
    <MergeModePanel
      backupUsers={backupUsers}
      localUsers={localUsers}
      mapping={mapping}
      onMappingChange={onMappingChange}
    />
  )
}

interface ReplaceModePanelProps {
  backupUsers: BackupUserInfo[]
  mapping: UserMapping
  onMappingChange: (mapping: UserMapping) => void
  currentUsername?: string
}

/**
 * Replace mode: User selects which backup user represents them.
 * The backup user's data will become the current user's data.
 */
function ReplaceModePanel(props: ReplaceModePanelProps) {
  const { backupUsers, mapping, onMappingChange, currentUsername } = props

  // Find which backup user is currently selected (if any)
  const selectedBackupUser = Object.keys(mapping)[0] ?? ''

  const handleSelect = (backupUsername: string) => {
    if (!currentUsername) return
    if (backupUsername === '') {
      onMappingChange({})
    } else {
      // Map: backupUsername -> currentUsername (backup user's data goes to current user)
      onMappingChange({ [backupUsername]: currentUsername })
    }
  }

  return (
    <Stack spacing={2}>
      <FormControl fullWidth size="small">
        <InputLabel id="replace-user-select-label">I am this user from the backup</InputLabel>
        <Select
          labelId="replace-user-select-label"
          value={selectedBackupUser}
          label="I am this user from the backup"
          onChange={(e) => handleSelect(e.target.value)}
        >
          <MenuItem value="">
            <em>None - import all users as-is</em>
          </MenuItem>
          {backupUsers.map((user) => (
            <MenuItem key={user.username} value={user.username}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                <PersonIcon fontSize="small" color="action" />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" component="span">
                    {user.displayName || user.username}
                    {user.isBggUser && (
                      <Chip 
                        label="BGG" 
                        size="small" 
                        variant="outlined" 
                        sx={{ ml: 0.5, height: 16, fontSize: '0.6rem' }} 
                      />
                    )}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" component="div">
                    {user.gameCount} games • {user.preferenceCount} preferences
                  </Typography>
                </Box>
              </Stack>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {selectedBackupUser && (
        <Alert severity="info" sx={{ py: 0.5 }}>
          The backup user "{backupUsers.find(u => u.username === selectedBackupUser)?.displayName || selectedBackupUser}" 
          will be imported as your current user. All other local data will be replaced.
        </Alert>
      )}
    </Stack>
  )
}

interface MergeModePanelProps {
  backupUsers: BackupUserInfo[]
  localUsers: UserRecord[]
  mapping: UserMapping
  onMappingChange: (mapping: UserMapping) => void
}

/**
 * Merge mode: Map backup users to existing local users.
 * Shows confirmation that preferences and game collections will be merged.
 */
function MergeModePanel(props: MergeModePanelProps) {
  const { backupUsers, localUsers, mapping, onMappingChange } = props

  // Filter out deleted users from local users
  const activeLocalUsers = localUsers.filter((u) => !u.isDeleted)

  const handleMappingChange = (backupUsername: string, targetUsername: string) => {
    const newMapping = { ...mapping }
    if (targetUsername === backupUsername || targetUsername === '') {
      delete newMapping[backupUsername]
    } else {
      newMapping[backupUsername] = targetUsername
    }
    onMappingChange(newMapping)
  }

  // Check for conflicts (multiple backup users mapped to same local user)
  const targetCounts = new Map<string, number>()
  for (const target of Object.values(mapping)) {
    targetCounts.set(target, (targetCounts.get(target) ?? 0) + 1)
  }
  const hasConflict = Array.from(targetCounts.values()).some((count) => count > 1)
  const hasMappings = Object.keys(mapping).length > 0

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Map backup users to existing local users. Unmapped users will be imported as new users.
      </Typography>

      {hasMappings && (
        <Alert severity="info" sx={{ py: 0.5 }}>
          Mapped users will have their <strong>game collections</strong> and <strong>preferences</strong> merged 
          with the existing local user's data.
        </Alert>
      )}

      {hasConflict && (
        <Alert severity="warning" sx={{ py: 0.5 }}>
          Multiple backup users are mapped to the same local user. Their data will all be merged together.
        </Alert>
      )}

      {backupUsers.map((backupUser) => (
        <UserMappingRow
          key={backupUser.username}
          backupUser={backupUser}
          localUsers={activeLocalUsers}
          currentTarget={mapping[backupUser.username] ?? ''}
          onTargetChange={(target) => handleMappingChange(backupUser.username, target)}
        />
      ))}
    </Stack>
  )
}

interface UserMappingRowProps {
  backupUser: BackupUserInfo
  localUsers: UserRecord[]
  currentTarget: string
  onTargetChange: (target: string) => void
}

function UserMappingRow(props: UserMappingRowProps) {
  const { backupUser, localUsers, currentTarget, onTargetChange } = props

  const displayLabel = backupUser.displayName || backupUser.username

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.default',
      }}
    >
      {/* Source user info */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <PersonIcon fontSize="small" color="action" />
          <Typography variant="body2" fontWeight={600} noWrap>
            {displayLabel}
          </Typography>
          {backupUser.isBggUser && (
            <Chip label="BGG" size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
          )}
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {backupUser.gameCount} games • {backupUser.preferenceCount} preferences
        </Typography>
      </Box>

      {/* Arrow */}
      <ArrowForwardIcon fontSize="small" color="action" />

      {/* Target selector */}
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id={`map-${backupUser.username}-label`}>Map to</InputLabel>
        <Select
          labelId={`map-${backupUser.username}-label`}
          value={currentTarget}
          label="Map to"
          onChange={(e) => onTargetChange(e.target.value)}
        >
          <MenuItem value="">
            <em>Import as new user</em>
          </MenuItem>
          {localUsers
            .filter((u) => u.username !== backupUser.username)
            .map((user) => (
              <MenuItem key={user.username} value={user.username}>
                {user.displayName || user.username}
              </MenuItem>
            ))}
        </Select>
      </FormControl>
    </Box>
  )
}
