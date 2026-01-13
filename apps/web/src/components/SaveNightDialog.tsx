import { useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import type { GameRecord } from '../db/types'

export interface SaveNightDialogProps {
  open: boolean
  playerCount: number
  gameCount: number
  topPick: { game: GameRecord; score: number } | null
  onClose: () => void
  onSave: (name: string, description?: string) => Promise<void>
}

export function SaveNightDialog({
  open,
  playerCount,
  gameCount,
  topPick,
  onClose,
  onSave,
}: SaveNightDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setIsSaving(true)
    try {
      await onSave(name.trim(), description.trim() || undefined)
      setName('')
      setDescription('')
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    if (!isSaving) {
      setName('')
      setDescription('')
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Save Game Night</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField
            label="Name"
            placeholder="e.g., Friday Board Game Night"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            autoFocus
            disabled={isSaving}
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
