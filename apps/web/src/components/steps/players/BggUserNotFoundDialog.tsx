import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material'

export function BggUserNotFoundDialog(props: {
  open: boolean
  username: string
  isLoading?: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const { open, username, isLoading = false, onCancel, onConfirm } = props

  return (
    <Dialog open={open} onClose={isLoading ? undefined : onCancel}>
      <DialogTitle>User not found on BGG</DialogTitle>
      <DialogContent>
        <Stack spacing={1.25} sx={{ mt: 0.5 }}>
          <Typography variant="body2">
            We couldn’t confirm the username “{username}” on BoardGameGeek.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add anyway to keep it as a BGG profile in PIKME (with an empty collection for now).
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={onConfirm} disabled={isLoading}>
          Add anyway
        </Button>
      </DialogActions>
    </Dialog>
  )
}
