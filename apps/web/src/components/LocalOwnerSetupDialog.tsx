/**
 * LocalOwnerSetupDialog
 *
 * First-time setup dialog that prompts user to identify themselves.
 * See Requirements/user-journeys.md Section 2 for the flow diagram.
 *
 * This dialog is shown when:
 * - Database has no user with isLocalOwner=true
 * - User is NOT arriving via a session invite (invite flow handles identity)
 */

import { useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import PersonIcon from '@mui/icons-material/Person'
import { createLocalOwner } from '../hooks/useLocalOwner'

export interface LocalOwnerSetupDialogProps {
  open: boolean
  onComplete: () => void
}

/**
 * Dialog for first-time user setup.
 * Creates the local owner user record.
 */
export function LocalOwnerSetupDialog({ open, onComplete }: LocalOwnerSetupDialogProps) {
  const [displayName, setDisplayName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    const trimmedName = displayName.trim()
    if (!trimmedName) {
      setError('Please enter your name')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await createLocalOwner({ displayName: trimmedName })
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile')
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && displayName.trim()) {
      handleSubmit()
    }
  }

  return (
    <Dialog open={open} maxWidth="xs" fullWidth disableEscapeKeyDown>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <PersonIcon color="primary" />
          <span>Welcome to PIKME!</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} pt={1}>
          <Typography variant="body2" color="text.secondary">
            Let's get started! Enter your name so we can save your game preferences.
          </Typography>

          <TextField
            autoFocus
            fullWidth
            label="Your name"
            placeholder="e.g., John"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
            error={!!error}
            helperText={error}
            slotProps={{
              htmlInput: { maxLength: 50 },
            }}
          />

          <Box
            sx={{
              bgcolor: 'action.hover',
              borderRadius: 1,
              p: 2,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              💡 You can add more players later in the Players step. Your preferences
              will be saved locally on this device.
            </Typography>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!displayName.trim() || isSubmitting}
          fullWidth
        >
          {isSubmitting ? 'Setting up...' : 'Get Started'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
