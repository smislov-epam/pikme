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
  Typography,
} from '@mui/material'
import PersonIcon from '@mui/icons-material/Person'
import AddIcon from '@mui/icons-material/Add'
import type { UserRecord } from '../../../db/types'
import { extractSuffixFromId } from '../../../services/db/userIdService'

export interface DuplicateUserNameDialogProps {
  open: boolean
  name: string
  existingUsers: UserRecord[]
  isLoading?: boolean
  onCancel: () => void
  onSelectExisting: (user: UserRecord) => void
  onCreateNew: () => void
}

export function DuplicateUserNameDialog({
  open,
  name,
  existingUsers,
  isLoading = false,
  onCancel,
  onSelectExisting,
  onCreateNew,
}: DuplicateUserNameDialogProps) {
  return (
    <Dialog open={open} onClose={isLoading ? undefined : onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>Player "{name}" already exists</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            {existingUsers.length === 1
              ? 'A player with this name already exists. Would you like to add them to this session, or create a new player?'
              : `${existingUsers.length} players with this name already exist. Select one to add to this session, or create a new player.`}
          </Typography>

          <List dense disablePadding>
            {existingUsers.map((user) => {
              const suffix = extractSuffixFromId(user.internalId)
              return (
                <ListItemButton
                  key={user.username}
                  onClick={() => onSelectExisting(user)}
                  disabled={isLoading}
                  sx={{ borderRadius: 1, mb: 0.5 }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <PersonIcon color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary={user.displayName || user.username}
                    secondary={suffix ? `ID: #${suffix}` : undefined}
                  />
                </ListItemButton>
              )
            })}

            <ListItemButton
              onClick={onCreateNew}
              disabled={isLoading}
              sx={{
                borderRadius: 1,
                bgcolor: 'action.hover',
                '&:hover': { bgcolor: 'action.selected' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <AddIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Create new player"
                secondary={`A new "${name}" with a unique ID`}
                primaryTypographyProps={{ color: 'primary' }}
              />
            </ListItemButton>
          </List>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  )
}
