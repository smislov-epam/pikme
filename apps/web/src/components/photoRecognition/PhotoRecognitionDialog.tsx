import { useState, useRef, useCallback } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import { colors } from '../../theme/theme'
import {
  recognizeGamesFromFile,
  validateImageFile,
  type RecognizedGameTile as RecognizedGameTileType,
  type PhotoRecognitionResult,
  type BggMatchResult,
} from '../../services/openai/photoRecognition'
import { hasOpenAiApiKey } from '../../services/openai/openaiClient'
import { RecognitionResultsView } from './RecognitionResultsView'
import { AddingProgressView, type AddingProgress } from './AddingProgressView'
import { CaptureView, AnalyzingView } from './CaptureViews'

export interface BatchAddResult {
  succeeded: Array<{ bggId: number; name: string }>
  failed: Array<{ bggId: number; name: string; error: string }>
}

interface PhotoRecognitionDialogProps {
  open: boolean
  onClose: () => void
  onGamesAdded: (result: BatchAddResult) => void
  onOpenApiKeyDialog: () => void
  ownerUsername: string
  /** Function to add a game to user - handles both DB and state updates */
  addGameToUser: (username: string, bggId: number) => Promise<void>
}

type DialogState = 'capture' | 'analyzing' | 'results' | 'adding' | 'error'

export function PhotoRecognitionDialog({
  open,
  onClose,
  onGamesAdded,
  onOpenApiKeyDialog,
  ownerUsername,
  addGameToUser,
}: PhotoRecognitionDialogProps) {
  const [state, setState] = useState<DialogState>('capture')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [result, setResult] = useState<PhotoRecognitionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dismissedGames, setDismissedGames] = useState<Set<string>>(new Set())
  const [addedGames, setAddedGames] = useState<Set<string>>(new Set())
  const [addingProgress, setAddingProgress] = useState<AddingProgress | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const resetState = useCallback(() => {
    setState('capture')
    setImagePreview(null)
    setResult(null)
    setError(null)
    setDismissedGames(new Set())
    setAddedGames(new Set())
    setAddingProgress(null)
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

  const handleAddGames = useCallback(
    async (gamesToAdd: RecognizedGameTileType[]) => {
      if (gamesToAdd.length === 0) return

      const gamesWithMatch = gamesToAdd.filter((g) => g.bggMatch)
      if (gamesWithMatch.length === 0) return

      setState('adding')
      setAddingProgress({
        current: 0,
        total: gamesWithMatch.length,
        succeeded: 0,
        failed: 0,
        currentGameName: gamesWithMatch[0].bggMatch!.name,
      })

      const succeeded: Array<{ bggId: number; name: string }> = []
      const failed: Array<{ bggId: number; name: string; error: string }> = []

      for (let i = 0; i < gamesWithMatch.length; i++) {
        const game = gamesWithMatch[i]
        const bggId = game.bggMatch!.bggId
        const name = game.bggMatch!.name

        setAddingProgress({
          current: i + 1,
          total: gamesWithMatch.length,
          succeeded: succeeded.length,
          failed: failed.length,
          currentGameName: name,
        })

        try {
          // Use the passed-in addGameToUser which updates both DB and React state
          await addGameToUser(ownerUsername, bggId)
          succeeded.push({ bggId, name })
        } catch (err) {
          failed.push({
            bggId,
            name,
            error: err instanceof Error ? err.message : 'Failed to add game',
          })
        }
      }

      const result: BatchAddResult = { succeeded, failed }

      // Mark added games
      for (const game of result.succeeded) {
        const recognized = gamesWithMatch.find((g) => g.bggMatch?.bggId === game.bggId)
        if (recognized) {
          setAddedGames((prev) => new Set([...prev, recognized.recognizedName]))
        }
      }

      // Notify parent of results (for toast)
      onGamesAdded(result)

      // Return to results view
      setState('results')
      setAddingProgress(null)
    },
    [ownerUsername, onGamesAdded, addGameToUser]
  )

  const handleAdd = useCallback(
    (game: RecognizedGameTileType) => {
      handleAddGames([game])
    },
    [handleAddGames]
  )

  const handleAddAll = useCallback(() => {
    const gamesToAdd =
      result?.games.filter(
        (g) => g.bggMatch && !addedGames.has(g.recognizedName) && !dismissedGames.has(g.recognizedName)
      ) || []
    handleAddGames(gamesToAdd)
  }, [result, addedGames, dismissedGames, handleAddGames])

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
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            m: 0,
            px: 2.5,
            py: 1.75,
            bgcolor: colors.oceanBlue,
            color: 'white',
          }}
        >
          <CameraAltIcon fontSize="small" />
          Photo Recognition
          <IconButton
            onClick={handleClose}
            sx={{ position: 'absolute', right: 8, top: 8, color: 'white' }}
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
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          m: 0,
          px: 2.5,
          py: 1.75,
          bgcolor: colors.oceanBlue,
          color: 'white',
        }}
      >
        <CameraAltIcon fontSize="small" />
        Photo Recognition
        <IconButton
          onClick={handleClose}
          sx={{ position: 'absolute', right: 8, top: 8, color: 'white' }}
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

        {state === 'adding' && addingProgress && (
          <AddingProgressView progress={addingProgress} />
        )}

        {state === 'results' && (
          <ResultsStateView
            imagePreview={imagePreview}
            visibleGames={visibleGames}
            onDismiss={handleDismiss}
            onAdd={handleAdd}
            onAddAll={handleAddAll}
            onBggMatch={handleBggMatch}
            addedGames={addedGames}
            onTryAnother={resetState}
          />
        )}

        {state === 'error' && <ErrorView error={error} onRetry={resetState} />}
      </DialogContent>
    </Dialog>
  )
}

// Sub-components for cleaner organization

interface ResultsStateViewProps {
  imagePreview: string | null
  visibleGames: RecognizedGameTileType[]
  onDismiss: (name: string) => void
  onAdd: (game: RecognizedGameTileType) => void
  onAddAll: () => void
  onBggMatch: (recognizedName: string, match: BggMatchResult) => void
  addedGames: Set<string>
  onTryAnother: () => void
}

function ResultsStateView({
  imagePreview,
  visibleGames,
  onDismiss,
  onAdd,
  onAddAll,
  onBggMatch,
  addedGames,
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
        addedGames={addedGames}
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
