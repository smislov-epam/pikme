import { Box, Button, Container, Paper, alpha } from '@mui/material'
import { colors } from '../../theme/theme'

export function WizardFooter(props: {
  canGoBack: boolean
  canGoNext: boolean
  isLastStep: boolean
  canSave: boolean
  onBack: () => void
  onNext: () => void
  onStartOver: () => void
  onSave: () => void
}) {
  const {
    canGoBack,
    canGoNext,
    isLastStep,
    canSave,
    onBack,
    onNext,
    onStartOver,
    onSave,
  } = props

  return (
    <Paper
      component="footer"
      elevation={0}
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: alpha(colors.warmWhite, 0.98),
        backdropFilter: 'blur(8px)',
      }}
    >
      <Container maxWidth="sm" sx={{ py: 2 }}>
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Button
            variant="text"
            disabled={!canGoBack}
            onClick={onBack}
            sx={{ color: 'text.secondary' }}
          >
            Back
          </Button>

          {!isLastStep ? (
            <Button
              variant="contained"
              disabled={!canGoNext}
              onClick={onNext}
              size="large"
              sx={{ minWidth: 140, py: 1.5 }}
            >
              Next
            </Button>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" onClick={onStartOver}>
                Start over
              </Button>
              <Button
                variant="contained"
                onClick={onSave}
                disabled={!canSave}
                sx={{
                  bgcolor: colors.sand,
                  color: colors.navyBlue,
                  '&:hover': { bgcolor: '#E5D194' },
                }}
              >
                Save game night
              </Button>
            </Box>
          )}
        </Box>
      </Container>
    </Paper>
  )
}
