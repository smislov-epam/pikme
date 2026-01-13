import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { setBggApiKey, hasBggApiKey, clearBggApiKey } from '../services/bgg/bggClient'

interface BggApiKeyDialogProps {
  open: boolean
  onClose: () => void
  onKeySaved: () => void
}

export function BggApiKeyDialog({ open, onClose, onKeySaved }: BggApiKeyDialogProps) {
  const [apiKey, setApiKey] = useState('')
  const [hasKey] = useState(hasBggApiKey)

  const handleSave = () => {
    if (apiKey.trim()) {
      setBggApiKey(apiKey.trim())
      onKeySaved()
      onClose()
    }
  }

  const handleClear = () => {
    clearBggApiKey()
    setApiKey('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>BoardGameGeek API Key (Optional)</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="info">
            An API key enables searching games and importing BGG collections automatically.
            Without a key, you can still add games by pasting BGG links.
          </Alert>

          <Typography variant="body2">
            <strong>How to get a free API key:</strong>
          </Typography>

          <Box component="ol" sx={{ pl: 2, m: 0 }}>
            <Typography component="li" variant="body2">
              Go to{' '}
              <Link
                href="https://boardgamegeek.com/applications"
                target="_blank"
                rel="noopener noreferrer"
              >
                boardgamegeek.com/applications
              </Link>
            </Typography>
            <Typography component="li" variant="body2">
              Log in to your BGG account
            </Typography>
            <Typography component="li" variant="body2">
              Click "Register New Application"
            </Typography>
            <Typography component="li" variant="body2">
              Fill in the form (any name works for personal use)
            </Typography>
            <Typography component="li" variant="body2">
              Copy your API token and paste it below
            </Typography>
          </Box>

          <TextField
            label="API Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your BGG API key"
            fullWidth
            type="password"
            helperText="Your key is stored locally in your browser"
          />

          {hasKey && (
            <Alert severity="success">
              You already have an API key saved. Enter a new one to replace it.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {hasKey && (
          <Button onClick={handleClear} color="error">
            Clear Key
          </Button>
        )}
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={!apiKey.trim()}>
          Save Key
        </Button>
      </DialogActions>
    </Dialog>
  )
}
