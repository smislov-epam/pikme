import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Typography,
} from '@mui/material'

export function RefreshFromBggConfirmDialog(props: {
  open: boolean
  keepNotes: boolean
  onChangeKeepNotes: (keep: boolean) => void
  onCancel: () => void
  onConfirm: () => void
  isRefreshing?: boolean
}) {
  const { open, keepNotes, onChangeKeepNotes, onCancel, onConfirm, isRefreshing } = props

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>Refresh from BGG</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          This will overwrite game fields from BoardGameGeek.
        </Typography>
        <FormControlLabel
          control={
            <Checkbox
              checked={keepNotes}
              onChange={(e) => onChangeKeepNotes(e.target.checked)}
            />
          }
          label="Keep my local notes"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={!!isRefreshing}>
          Cancel
        </Button>
        <Button variant="contained" onClick={onConfirm} disabled={!!isRefreshing}>
          {isRefreshing ? 'Refreshing…' : 'Refresh'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
