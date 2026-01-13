import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'

export function ClearAllDataDialog(props: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  const { open, onClose, onConfirm } = props

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Clear All Data?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          This will permanently delete all players, games, preferences, and saved game nights.
          This action cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onConfirm} color="error" variant="contained">
          Clear Everything
        </Button>
      </DialogActions>
    </Dialog>
  )
}
