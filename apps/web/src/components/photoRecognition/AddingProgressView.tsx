import { Box, LinearProgress, Stack, Typography } from '@mui/material'

export interface AddingProgress {
  current: number
  total: number
  succeeded: number
  failed: number
  currentGameName: string
}

interface AddingProgressViewProps {
  progress: AddingProgress
}

export function AddingProgressView({ progress }: AddingProgressViewProps) {
  const percentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0
  
  return (
    <Stack spacing={3} sx={{ py: 4, alignItems: 'center' }}>
      <Typography variant="h6">Adding Games to Collection</Typography>
      
      <Box sx={{ width: '100%', px: 2 }}>
        <LinearProgress 
          variant="determinate" 
          value={percentage} 
          sx={{ height: 8, borderRadius: 4 }}
        />
      </Box>
      
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="body1" sx={{ fontWeight: 500 }}>
          {progress.current} of {progress.total}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Loading details for: {progress.currentGameName}
        </Typography>
      </Box>
      
      <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
        <Typography variant="body2" color="success.main">
          ✓ {progress.succeeded} added
        </Typography>
        {progress.failed > 0 && (
          <Typography variant="body2" color="error.main">
            ✗ {progress.failed} failed
          </Typography>
        )}
      </Box>
      
      <Typography variant="caption" color="text.secondary">
        Fetching full game details from BoardGameGeek...
      </Typography>
    </Stack>
  )
}
