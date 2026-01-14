import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import type { ReactElement } from 'react'
import type { GameRecord, UserRecord } from '../../db/types'
import { GameNotesPanel } from '../gameNotes/GameNotesPanel'
import { GameOwnersPanel } from './GameOwnersPanel'
import { GameDetailsSummaryPanel } from './GameDetailsSummaryPanel'

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
        Game details
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
          height: { xs: 'auto', sm: '72vh' },
          overflow: { xs: 'auto', sm: 'hidden' },
        }}
      >
        <GameDetailsSummaryPanel game={game} onEdit={onEdit} />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '3fr 1fr' },
            gap: 2,
            alignItems: 'stretch',
            flex: 1,
            minHeight: 0,
          }}
        >
          <Box sx={{ minWidth: 0, height: '100%', minHeight: 0 }}>
            <GameNotesPanel bggId={game.bggId} height="100%" />
          </Box>

          <Box sx={{ minWidth: 0, height: '100%', minHeight: 0, overflow: 'auto' }}>
            <GameOwnersPanel
              game={game}
              owners={owners}
              users={users}
              onAddOwner={onAddOwner}
              onRemoveOwner={onRemoveOwner}
            />
          </Box>
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
