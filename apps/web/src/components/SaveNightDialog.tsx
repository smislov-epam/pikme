import { useState } from 'react'
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import type { GameRecord } from '../db/types'
import { colors } from '../theme/theme'

export interface SaveNightDialogProps {
  open: boolean
  playerCount: number
  gameCount: number
  topPick: { game: GameRecord; score: number } | null
  guestUsers?: { username: string; displayName: string }[]
  onClose: () => void
  onSave: (name: string, description?: string, includeGuestUsernames?: string[]) => Promise<void>
}

export function SaveNightDialog({
  open,
  playerCount,
  gameCount,
  topPick,
  guestUsers = [],
  onClose,
  onSave,
}: SaveNightDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [includedGuests, setIncludedGuests] = useState<Record<string, boolean>>({})

  const handleSave = async () => {
    if (!name.trim()) return
    setIsSaving(true)
    try {
      const selectedGuests = guestUsers
        .filter((g) => includedGuests[g.username])
        .map((g) => g.username)
      await onSave(name.trim(), description.trim() || undefined, selectedGuests)
      setName('')
      setDescription('')
      setIncludedGuests({})
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    if (!isSaving) {
      setName('')
      setDescription('')
      setIncludedGuests({})
      onClose()
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          px: 2.5,
          py: 1.75,
          bgcolor: colors.oceanBlue,
          color: 'white',
          borderBottom: 'none',
          borderTopLeftRadius: (theme) => theme.shape.borderRadius,
          borderTopRightRadius: (theme) => theme.shape.borderRadius,
          overflow: 'hidden',
        }}
      >
        Save Game Night
      </DialogTitle>
      <DialogContent sx={{ overflowX: 'hidden' }}>
        <Stack spacing={2.5} sx={{ mt: 2.5, width: '100%' }}>
          <TextField
            label="Name"
            placeholder="e.g., Friday Board Game Night"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            autoFocus
            disabled={isSaving}
            sx={{
              '& .MuiInputBase-input': {
                overflowX: 'hidden',
              },
            }}
          />
          <TextField
            label="Description (optional)"
            placeholder="e.g., Quick games for after dinner"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
            disabled={isSaving}
            sx={{
              '& .MuiInputBase-inputMultiline': {
                overflowX: 'hidden',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
              },
            }}
          />
          <Stack
            spacing={0.5}
            sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1 }}
          >
            <Typography variant="body2" color="text.secondary">
              Summary
            </Typography>
            <Typography variant="body2">
              {playerCount} players • {gameCount} games in session
            </Typography>
            {topPick && (
              <Typography variant="body2" fontWeight={500}>
                Top pick: {topPick.game.name}
              </Typography>
            )}
          </Stack>

          {guestUsers.length > 0 && (
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                Include guests in saved night
              </Typography>
              <FormGroup>
                {guestUsers.map((guest) => (
                  <FormControlLabel
                    key={guest.username}
                    control={
                      <Checkbox
                        checked={Boolean(includedGuests[guest.username])}
                        onChange={(e) =>
                          setIncludedGuests((prev) => ({
                            ...prev,
                            [guest.username]: e.target.checked,
                          }))
                        }
                      />
                    }
                    label={guest.displayName}
                  />
                ))}
              </FormGroup>
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!name.trim() || isSaving}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
