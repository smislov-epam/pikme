import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import type { GameRecord } from '../db/types'
import { useToast } from '../services/toast'
import { GameEditFieldsPane } from './gameEdit/GameEditFieldsPane'
import { GameEditSummaryPane } from './gameEdit/GameEditSummaryPane'
import { RefreshFromBggConfirmDialog } from './gameEdit/RefreshFromBggConfirmDialog'

export interface GameEditDialogProps {
  open: boolean
  game: GameRecord | null
  onClose: () => void
  onSave: (game: GameRecord) => Promise<void>
  onRefreshFromBgg?: (bggId: number, options: { keepNotes: boolean }) => Promise<GameRecord>
}

export function GameEditDialog({ open, game, onClose, onSave, onRefreshFromBgg }: GameEditDialogProps) {
  const toast = useToast()
  const [editedGame, setEditedGame] = useState<GameRecord | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [confirmRefreshOpen, setConfirmRefreshOpen] = useState(false)
  const [keepNotes, setKeepNotes] = useState(true)

  useEffect(() => {
    if (game) {
      setEditedGame({ ...game })
    }
  }, [game])

  if (!editedGame) return null

  const handleSave = async () => {
    if (!editedGame) return
    setIsSaving(true)
    try {
      await onSave(editedGame)
      onClose()
      toast.success('Saved changes')
    } finally {
      setIsSaving(false)
    }
  }

  const handleChange = (field: keyof GameRecord, value: unknown) => {
    setEditedGame((prev) => prev ? { ...prev, [field]: value } : null)
  }

  const handleConfirmRefresh = async () => {
    if (!onRefreshFromBgg) return
    setIsRefreshing(true)
    try {
      const refreshed = await onRefreshFromBgg(editedGame.bggId, { keepNotes })
      setEditedGame({ ...refreshed })
      toast.success('Refreshed from BGG')
      setConfirmRefreshOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to refresh from BGG')
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 6 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" component="span" noWrap>
            Edit game
          </Typography>
        </Box>
        <IconButton
          href={`https://boardgamegeek.com/boardgame/${editedGame.bggId}`}
          target="_blank"
          component="a"
          size="small"
          title="View on BGG"
        >
          <OpenInNewIcon fontSize="small" />
        </IconButton>
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="flex-start">
          <Box sx={{ width: { xs: '100%', sm: 360 }, flexShrink: 0 }}>
            <GameEditSummaryPane
              game={editedGame}
              onRequestRefresh={onRefreshFromBgg ? () => setConfirmRefreshOpen(true) : undefined}
              isRefreshing={isRefreshing}
            />
          </Box>

          <Box sx={{ flex: 1, width: '100%' }}>
            <GameEditFieldsPane game={editedGame} onChange={handleChange} />
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isSaving || isRefreshing}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={isSaving || isRefreshing}>
          {isSaving ? 'Saving…' : 'Save changes'}
        </Button>
      </DialogActions>

      {onRefreshFromBgg ? (
        <RefreshFromBggConfirmDialog
          open={confirmRefreshOpen}
          keepNotes={keepNotes}
          onChangeKeepNotes={setKeepNotes}
          onCancel={() => (!isRefreshing ? setConfirmRefreshOpen(false) : null)}
          onConfirm={handleConfirmRefresh}
          isRefreshing={isRefreshing}
        />
      ) : null}
    </Dialog>
  )
}
