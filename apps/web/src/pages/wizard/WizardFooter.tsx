import { Box, Button, Container, Paper, alpha, useMediaQuery, useTheme } from '@mui/material'
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
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

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
        zIndex: (theme) => theme.zIndex.appBar,
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
                {isMobile ? 'Start' : 'Start over'}
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
                {isMobile ? 'Save Game' : 'Save game night'}
              </Button>
            </Box>
          )}
        </Box>
      </Container>
    </Paper>
  )
}
