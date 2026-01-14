import { useState } from 'react'
import {
  Badge,
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import NotesIcon from '@mui/icons-material/Notes'
import type { ReactElement } from 'react'
import type { GameRecord, UserRecord } from '../../db/types'
import { GameNotesPanel } from '../gameNotes/GameNotesPanel'
import { GameOwnersPanel } from './GameOwnersPanel'
import { GameDetailsSummaryPanel } from './GameDetailsSummaryPanel'
import { useGameNotesCount } from '../../hooks/useGameNotesCount'

/** Height of the collapsible notes panel in pixels */
const NOTES_PANEL_HEIGHT = 200

export type GameDetailsDialogProps = {
  open: boolean
  game: GameRecord | null
  owners: string[]
  users: UserRecord[]
  onClose: () => void
  onAddOwner?: (username: string, bggId: number) => Promise<void>
  onRemoveOwner?: (username: string, bggId: number) => Promise<void>
  onExcludeFromSession?: () => void
  onEdit?: () => void
}

export function GameDetailsDialog({
  open,
  game,
  owners,
  users,
  onClose,
  onAddOwner,
  onRemoveOwner,
  onExcludeFromSession,
  onEdit,
}: GameDetailsDialogProps): ReactElement | null {
  const [showNotes, setShowNotes] = useState(false)
  const notesCount = useGameNotesCount(game?.bggId ?? 0)

  if (!game) return null

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          pr: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          Game details
          <Tooltip title={showNotes ? 'Hide notes' : 'Show notes'}>
            <IconButton
              size="small"
              onClick={() => setShowNotes(!showNotes)}
              color={showNotes ? 'primary' : 'default'}
            >
              <Badge badgeContent={notesCount} color="primary" max={99}>
                <NotesIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>
        </Box>
        <IconButton aria-label="Close" onClick={onClose} size="small" sx={{ color: 'error.main' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          maxHeight: { xs: '70vh', sm: '72vh' },
          overflow: 'auto',
        }}
      >
        <GameDetailsSummaryPanel game={game} onEdit={onEdit} />

        <Collapse in={showNotes}>
          <Box sx={{ minHeight: NOTES_PANEL_HEIGHT }}>
            <GameNotesPanel bggId={game.bggId} height={NOTES_PANEL_HEIGHT} />
          </Box>
        </Collapse>

        <Box sx={{ minWidth: 0 }}>
          <GameOwnersPanel
            game={game}
            owners={owners}
            users={users}
            onAddOwner={onAddOwner}
            onRemoveOwner={onRemoveOwner}
          />
        </Box>
      </DialogContent>

      <DialogActions>
        {onExcludeFromSession ? (
          <Button color="warning" variant="outlined" onClick={onExcludeFromSession}>
            Remove from session
          </Button>
        ) : null}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
