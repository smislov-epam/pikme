import { Box, Button, CircularProgress, Stack, Typography, Alert } from '@mui/material'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary'

interface CaptureViewProps {
  onCapture: React.RefObject<HTMLInputElement | null>
  onUpload: React.RefObject<HTMLInputElement | null>
}

export function CaptureView({ onCapture, onUpload }: CaptureViewProps) {
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

interface AnalyzingViewProps {
  imagePreview: string | null
}

export function AnalyzingView({ imagePreview }: AnalyzingViewProps) {
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
