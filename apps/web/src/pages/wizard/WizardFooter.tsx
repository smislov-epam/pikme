import { Box, Button, Container, Paper, alpha, useMediaQuery, useTheme } from '@mui/material'
import ShareIcon from '@mui/icons-material/Share'
import VisibilityIcon from '@mui/icons-material/Visibility'
import DoneIcon from '@mui/icons-material/Done'
import { colors } from '../../theme/theme'

export function WizardFooter(props: {
  canGoBack: boolean
  canGoNext: boolean
  isLastStep: boolean
  canSave: boolean
  canShare?: boolean
  hasSession?: boolean
  /** Whether we're in session guest mode (joined a session with local games) */
  sessionGuestMode?: boolean
  onBack: () => void
  onNext: () => void
  onStartOver: () => void
  onSave: () => void
  onShare?: () => void
  onExitSession?: () => void
}) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const {
    canGoBack,
    canGoNext,
    isLastStep,
    canSave,
    canShare = false,
    hasSession = false,
    sessionGuestMode = false,
    onBack,
    onNext,
    onStartOver,
    onSave,
    onShare,
    onExitSession,
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
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {canShare && !sessionGuestMode && (
                <Button
                  variant="outlined"
                  onClick={onShare}
                  startIcon={<ShareIcon />}
                  sx={{ minWidth: isMobile ? 'auto' : 100 }}
                >
                  {isMobile ? '' : 'Share'}
                </Button>
              )}
              <Button
                variant="contained"
                disabled={!canGoNext}
                onClick={onNext}
                size="large"
                sx={{ minWidth: 140, py: 1.5 }}
              >
                Next
              </Button>
            </Box>
          ) : sessionGuestMode ? (
            // Session guest mode - show "Done" instead of Save/Share
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                onClick={onExitSession}
                startIcon={<DoneIcon />}
                sx={{
                  bgcolor: colors.sand,
                  color: colors.navyBlue,
                  '&:hover': { bgcolor: '#E5D194' },
                }}
              >
                {isMobile ? 'Done' : 'Preferences Set'}
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              {canShare && (
                <Button
                  variant="outlined"
                  onClick={onShare}
                  startIcon={hasSession ? <VisibilityIcon /> : <ShareIcon />}
                  sx={{ minWidth: isMobile ? 'auto' : 100 }}
                >
                  {isMobile ? '' : hasSession ? 'See Invite' : 'Share'}
                </Button>
              )}
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
