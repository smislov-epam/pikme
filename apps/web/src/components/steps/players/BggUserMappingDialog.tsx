import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
  Chip,
  Box,
  Divider,
} from '@mui/material'
import PersonIcon from '@mui/icons-material/Person'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useState } from 'react'
import type { UserRecord } from '../../../db/types'
import { extractSuffixFromId } from '../../../services/db/userIdService'

export interface BggUserMappingDialogProps {
  open: boolean
  bggUsername: string
  existingLocalUsers: UserRecord[]
  isLoading?: boolean
  onCancel: () => void
  onLinkToExisting: (user: UserRecord) => void
  onCreateNew: (displayName: string) => void
}

export function BggUserMappingDialog({
  open,
  bggUsername,
  existingLocalUsers,
  isLoading = false,
  onCancel,
  onLinkToExisting,
  onCreateNew,
}: BggUserMappingDialogProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [displayName, setDisplayName] = useState(bggUsername)

  const handleCreateNew = () => {
    onCreateNew(displayName.trim() || bggUsername)
  }

  // Filter to show local users that are not already BGG users
  const localOnlyUsers = existingLocalUsers.filter((u) => !u.isBggUser && !u.isDeleted)

  return (
    <Dialog open={open} onClose={isLoading ? undefined : onCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography variant="h6" component="span">Map BGG user</Typography>
          <Chip
            size="small"
            icon={<RefreshIcon sx={{ fontSize: 16 }} />}
            label={bggUsername}
            color="primary"
            sx={{ fontWeight: 600 }}
          />
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            We'll sync games from this BGG account. Choose how to add this player:
          </Typography>

          {/* Option 1: Link to existing local user */}
          {localOnlyUsers.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                Link to existing player
              </Typography>
              <List dense disablePadding sx={{ bgcolor: 'action.hover', borderRadius: 1 }}>
                {localOnlyUsers.map((user) => {
                  const suffix = extractSuffixFromId(user.internalId)
                  const displayId = suffix || user.internalId
                  return (
                    <ListItemButton
                      key={user.username}
                      onClick={() => onLinkToExisting(user)}
                      disabled={isLoading}
                      sx={{ borderRadius: 1 }}
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <PersonIcon color="action" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <span>{user.displayName || user.username}</span>
                            {suffix && (
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                #{displayId}
                              </Typography>
                            )}
                          </Stack>
                        }
                        secondary={user.isOrganizer ? 'Organizer' : undefined}
                      />
                    </ListItemButton>
                  )
                })}
              </List>
            </Box>
          )}

          {localOnlyUsers.length > 0 && (
            <Divider>
              <Typography variant="caption" color="text.secondary">or</Typography>
            </Divider>
          )}

          {/* Option 2: Create new user with custom display name */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
              Create new player
            </Typography>
            <TextField
              fullWidth
              size="small"
              label="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={bggUsername}
              disabled={isLoading}
              helperText="This name will be shown in the app"
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, pt: 1, flexDirection: isMobile ? 'column' : 'row', gap: 1 }}>
        <Button
          onClick={onCancel}
          disabled={isLoading}
          fullWidth={isMobile}
          sx={{ order: isMobile ? 2 : 0 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleCreateNew}
          disabled={isLoading}
          fullWidth={isMobile}
          startIcon={<PersonIcon />}
        >
          Create "{displayName.trim() || bggUsername}"
        </Button>
      </DialogActions>
    </Dialog>
  )
}
