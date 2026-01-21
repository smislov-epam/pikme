import { useState, useRef, useCallback } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary'
import {
  recognizeGamesFromFile,
  validateImageFile,
  type RecognizedGameTile as RecognizedGameTileType,
  type PhotoRecognitionResult,
  type BggMatchResult,
} from '../../services/openai/photoRecognition'
import { hasOpenAiApiKey } from '../../services/openai/openaiClient'
import { RecognitionResultsView } from './RecognitionResultsView'

interface PhotoRecognitionDialogProps {
  open: boolean
  onClose: () => void
  onAddGame: (game: RecognizedGameTileType) => Promise<void>
  onOpenApiKeyDialog: () => void
}

type DialogState = 'capture' | 'analyzing' | 'results' | 'error'

export function PhotoRecognitionDialog({
  open,
  onClose,
  onAddGame,
  onOpenApiKeyDialog,
}: PhotoRecognitionDialogProps) {
  const [state, setState] = useState<DialogState>('capture')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [result, setResult] = useState<PhotoRecognitionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dismissedGames, setDismissedGames] = useState<Set<string>>(new Set())
  const [addingGames, setAddingGames] = useState<Set<string>>(new Set())
  const [addedGames, setAddedGames] = useState<Set<string>>(new Set())
  const [addErrors, setAddErrors] = useState<Map<string, string>>(new Map())
  const [isBulkAdding, setIsBulkAdding] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const resetState = useCallback(() => {
    setState('capture')
    setImagePreview(null)
    setResult(null)
    setError(null)
    setDismissedGames(new Set())
    setAddingGames(new Set())
    setAddedGames(new Set())
    setAddErrors(new Map())
    setIsBulkAdding(false)
  }, [])

  const handleClose = useCallback(() => {
    resetState()
    onClose()
  }, [onClose, resetState])

  const processFile = useCallback(async (file: File) => {
    const validation = validateImageFile(file)
    if (!validation.valid) {
      setError(validation.error || 'Invalid file')
      setState('error')
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    setState('analyzing')
    setError(null)

    try {
      const recognitionResult = await recognizeGamesFromFile(file)
      setResult(recognitionResult)
      setState('results')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Recognition failed'
      setError(message)
      setState('error')
    }
  }, [])

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        processFile(file)
      }
      // Reset input so same file can be selected again
      event.target.value = ''
    },
    [processFile]
  )

  const handleDismiss = useCallback((recognizedName: string) => {
    setDismissedGames((prev) => new Set([...prev, recognizedName]))
  }, [])

  const handleAdd = useCallback(
    async (game: RecognizedGameTileType) => {
      setAddingGames((prev) => new Set([...prev, game.recognizedName]))
      setAddErrors((prev) => {
        const next = new Map(prev)
        next.delete(game.recognizedName)
        return next
      })

      try {
        await onAddGame(game)
        setAddedGames((prev) => new Set([...prev, game.recognizedName]))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add game'
        setAddErrors((prev) => new Map(prev).set(game.recognizedName, message))
      } finally {
        setAddingGames((prev) => {
          const next = new Set(prev)
          next.delete(game.recognizedName)
          return next
        })
      }
    },
    [onAddGame]
  )

  const handleAddAll = useCallback(async () => {
    const gamesToAdd =
      result?.games.filter(
        (g) => g.bggMatch && !addedGames.has(g.recognizedName) && !dismissedGames.has(g.recognizedName)
      ) || []

    setIsBulkAdding(true)
    for (const game of gamesToAdd) {
      await handleAdd(game)
    }
    setIsBulkAdding(false)
  }, [result, addedGames, dismissedGames, handleAdd])

  const handleBggMatch = useCallback((recognizedName: string, match: BggMatchResult) => {
    setResult((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        games: prev.games.map((g) =>
          g.recognizedName === recognizedName ? { ...g, bggMatch: match } : g
        ),
      }
    })
  }, [])

  const visibleGames = result?.games.filter((g) => !dismissedGames.has(g.recognizedName)) || []

  // Check for API key
  if (open && !hasOpenAiApiKey()) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          Photo Recognition
          <IconButton
            onClick={handleClose}
            sx={{ position: 'absolute', right: 8, top: 8 }}
            aria-label="Close"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ py: 2 }}>
            <Alert severity="info">
              To use AI-powered photo recognition, you need to configure your OpenAI API key first.
            </Alert>
            <Button variant="contained" onClick={onOpenApiKeyDialog}>
              Configure API Key
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Photo Recognition
        <IconButton
          onClick={handleClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
          aria-label="Close"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {/* Hidden file inputs */}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          ref={fileInputRef}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          capture="environment"
          ref={cameraInputRef}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {state === 'capture' && <CaptureView onCapture={cameraInputRef} onUpload={fileInputRef} />}

        {state === 'analyzing' && <AnalyzingView imagePreview={imagePreview} />}

        {state === 'results' && (
          <ResultsStateView
            imagePreview={imagePreview}
            visibleGames={visibleGames}
            onDismiss={handleDismiss}
            onAdd={handleAdd}
            onAddAll={handleAddAll}
            onBggMatch={handleBggMatch}
            addingGames={addingGames}
            addedGames={addedGames}
            addErrors={addErrors}
            isBulkAdding={isBulkAdding}
            onTryAnother={resetState}
          />
        )}

        {state === 'error' && <ErrorView error={error} onRetry={resetState} />}
      </DialogContent>
    </Dialog>
  )
}

// Sub-components for cleaner organization

function CaptureView({
  onCapture,
  onUpload,
}: {
  onCapture: React.RefObject<HTMLInputElement | null>
  onUpload: React.RefObject<HTMLInputElement | null>
}) {
  return (
    <Stack spacing={2} sx={{ py: 2 }}>
      <Typography variant="body1">
        Take a photo of your board game shelf or upload an image to automatically identify games.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button
          variant="contained"
          startIcon={<CameraAltIcon />}
          onClick={() => onCapture.current?.click()}
          sx={{ flex: 1, maxWidth: 180 }}
        >
          Take Photo
        </Button>
        <Button
          variant="outlined"
          startIcon={<PhotoLibraryIcon />}
          onClick={() => onUpload.current?.click()}
          sx={{ flex: 1, maxWidth: 180 }}
        >
          Upload Image
        </Button>
      </Box>

      <Alert severity="info" sx={{ fontSize: '0.85rem' }}>
        Best results: clear photo with visible game boxes/spines. Max 20MB.
        <br />
        <strong>Cost:</strong> ~$0.01-0.04 per image analyzed.
      </Alert>
    </Stack>
  )
}

function AnalyzingView({ imagePreview }: { imagePreview: string | null }) {
  return (
    <Stack spacing={2} sx={{ py: 2, alignItems: 'center' }}>
      {imagePreview && (
        <Box
          component="img"
          src={imagePreview}
          alt="Uploaded"
          sx={{ maxWidth: '100%', maxHeight: 200, borderRadius: 1, objectFit: 'contain' }}
        />
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <CircularProgress size={24} />
        <Typography>Analyzing image...</Typography>
      </Box>
      <Typography variant="caption" color="text.secondary">
        This may take a few seconds
      </Typography>
    </Stack>
  )
}

interface ResultsStateViewProps {
  imagePreview: string | null
  visibleGames: RecognizedGameTileType[]
  onDismiss: (name: string) => void
  onAdd: (game: RecognizedGameTileType) => void
  onAddAll: () => void
  onBggMatch: (recognizedName: string, match: BggMatchResult) => void
  addingGames: Set<string>
  addedGames: Set<string>
  addErrors: Map<string, string>
  isBulkAdding: boolean
  onTryAnother: () => void
}

function ResultsStateView({
  imagePreview,
  visibleGames,
  onDismiss,
  onAdd,
  onAddAll,
  onBggMatch,
  addingGames,
  addedGames,
  addErrors,
  isBulkAdding,
  onTryAnother,
}: ResultsStateViewProps) {
  return (
    <Stack spacing={2} sx={{ py: 1 }}>
      {imagePreview && (
        <Box
          component="img"
          src={imagePreview}
          alt="Analyzed"
          sx={{ maxWidth: '100%', maxHeight: 120, borderRadius: 1, objectFit: 'contain' }}
        />
      )}

      <RecognitionResultsView
        games={visibleGames}
        onDismiss={onDismiss}
        onAdd={onAdd}
        onAddAll={onAddAll}
        onBggMatch={onBggMatch}
        addingGames={addingGames}
        addedGames={addedGames}
        addErrors={addErrors}
        isBulkAdding={isBulkAdding}
      />

      <Button variant="text" onClick={onTryAnother} sx={{ alignSelf: 'center' }}>
        Analyze Another Photo
      </Button>
    </Stack>
  )
}

function ErrorView({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  return (
    <Stack spacing={2} sx={{ py: 2 }}>
      <Alert severity="error">{error || 'An error occurred'}</Alert>
      <Button variant="contained" onClick={onRetry}>
        Try Again
      </Button>
    </Stack>
  )
}
