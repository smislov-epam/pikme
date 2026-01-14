import { useEffect, useRef } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'
import { HelpWalkthroughSections } from './help/HelpWalkthroughSections'

export type HelpTopic = 'clear' | 'settings' | null

export function HelpWalkthroughDialog(props: {
  open: boolean
  focusTopic?: HelpTopic
  onClose: () => void
}) {
  const { open, focusTopic = null, onClose } = props

  const clearRef = useRef<HTMLDivElement | null>(null)
  const settingsRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    if (focusTopic === 'clear') clearRef.current?.scrollIntoView({ block: 'start' })
    if (focusTopic === 'settings') settingsRef.current?.scrollIntoView({ block: 'start' })
  }, [focusTopic, open])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        PIKME walkthrough
        <IconButton
          aria-label="Close walkthrough"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8, color: 'error.main' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          maxHeight: { xs: '70vh', sm: '65vh' },
        }}
      >
        <Stack spacing={2}>
          <Box sx={{ bgcolor: 'primary.main', color: 'white', p: 2, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              🎲 End the "what should we play?" debate forever
            </Typography>
            <Typography variant="body2">
              PIKME brings peace to game night by guiding your group to a single pick everyone can enjoy. 
              No more endless discussions — just a calm 4-step wizard that considers everyone's preferences.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label="Players" size="small" color="primary" />
            <Chip label="Filters" size="small" color="primary" />
            <Chip label="Preferences" size="small" color="primary" />
            <Chip label="Result" size="small" color="primary" />
            <Chip label="No login" size="small" color="success" />
            <Chip label="Local-first" size="small" color="info" />
          </Box>

          <HelpWalkthroughSections clearRef={clearRef} settingsRef={settingsRef} />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
