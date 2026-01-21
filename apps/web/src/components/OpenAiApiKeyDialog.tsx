import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  setOpenAiApiKey,
  hasOpenAiApiKey,
  clearOpenAiApiKey,
  validateOpenAiApiKey,
} from '../services/openai/openaiClient'

interface OpenAiApiKeyDialogProps {
  open: boolean
  onClose: () => void
  onKeySaved: () => void
}

export function OpenAiApiKeyDialog({ open, onClose, onKeySaved }: OpenAiApiKeyDialogProps) {
  const [apiKey, setApiKey] = useState('')
  const [hasKey] = useState(hasOpenAiApiKey)
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!apiKey.trim()) return

    setIsValidating(true)
    setError(null)

    try {
      const isValid = await validateOpenAiApiKey(apiKey.trim())
      if (isValid) {
        setOpenAiApiKey(apiKey.trim())
        onKeySaved()
        onClose()
      } else {
        setError('Invalid API key. Please check and try again.')
      }
    } catch {
      setError('Failed to validate API key. Check your connection and try again.')
    } finally {
      setIsValidating(false)
    }
  }

  const handleClear = () => {
    clearOpenAiApiKey()
    setApiKey('')
    onClose()
  }

  const handleClose = () => {
    setApiKey('')
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>OpenAI API Key</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="info">
            An OpenAI API key enables AI-powered board game recognition from photos.
            Take a photo of your game shelf and let AI identify the games automatically.
          </Alert>

          <Typography variant="body2">
            <strong>How to get an API key:</strong>
          </Typography>

          <Box component="ol" sx={{ pl: 2, m: 0 }}>
            <Typography component="li" variant="body2">
              Go to{' '}
              <Link
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
              >
                platform.openai.com/api-keys
              </Link>
            </Typography>
            <Typography component="li" variant="body2">
              Create an account or log in
            </Typography>
            <Typography component="li" variant="body2">
              Click "Create new secret key"
            </Typography>
            <Typography component="li" variant="body2">
              Copy your key and paste it below
            </Typography>
          </Box>

          <Alert severity="warning" sx={{ fontSize: '0.85rem' }}>
            <strong>Note:</strong> OpenAI charges ~$0.01-0.04 per image analyzed.
            You control your own billing through your OpenAI account.
          </Alert>

          <TextField
            label="API Key"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value)
              setError(null)
            }}
            placeholder="sk-..."
            fullWidth
            type="password"
            error={!!error}
            helperText={
              error ||
              'Your key is stored locally in your browser and sent directly to OpenAI. It is never transmitted to PIKME servers.'
            }
            disabled={isValidating}
          />

          {hasKey && !error && (
            <Alert severity="success">
              You already have an API key saved. Enter a new one to replace it.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {hasKey && (
          <Button onClick={handleClear} color="error" disabled={isValidating}>
            Clear Key
          </Button>
        )}
        <Button onClick={handleClose} disabled={isValidating}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!apiKey.trim() || isValidating}
          startIcon={isValidating ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {isValidating ? 'Validating...' : 'Save Key'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
