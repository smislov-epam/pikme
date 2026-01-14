import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material'

export function ReusePreviousGamesDialog(props: {
  open: boolean
  nightName: string
  gameCount: number
  isLoading?: boolean
  onDismiss: () => void
  onConfirm: () => void
}) {
  const { open, nightName, gameCount, isLoading = false, onDismiss, onConfirm } = props

  return (
    <Dialog open={open} onClose={isLoading ? undefined : onDismiss}>
      <DialogTitle>Load games from your previous night?</DialogTitle>
      <DialogContent>
        <Stack spacing={1.25} sx={{ mt: 0.5 }}>
          <Typography variant="body2">
            We found a previous night that matches your host and player count.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            “{nightName}” ({gameCount} game{gameCount === 1 ? '' : 's'}).
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onDismiss} disabled={isLoading}>
          Not now
        </Button>
        <Button variant="contained" onClick={onConfirm} disabled={isLoading}>
          Load games
        </Button>
      </DialogActions>
    </Dialog>
  )
}
