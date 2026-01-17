/**
 * Error Boundary Component (REQ-107)
 *
 * Catches React errors and displays a recovery UI.
 * Prevents full app crashes from component errors.
 */

import { Component, type ReactNode, type ErrorInfo } from 'react'
import { Box, Button, Typography, Paper, Collapse, Stack } from '@mui/material'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import RefreshIcon from '@mui/icons-material/Refresh'
import HomeIcon from '@mui/icons-material/Home'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { colors } from '../theme/theme'

export interface FallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

export interface ErrorBoundaryProps {
  children: ReactNode
  /** Custom fallback component */
  fallback?: React.ComponentType<FallbackProps>
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /** Called when the error boundary resets */
  onReset?: () => void
  /** Show "Go Home" button */
  showHomeButton?: boolean
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  showDetails: boolean
}

/**
 * Default fallback UI for error boundaries.
 */
function DefaultFallback({
  error,
  resetErrorBoundary,
  showHomeButton = true,
  showDetails,
  onToggleDetails,
}: FallbackProps & {
  showHomeButton?: boolean
  showDetails: boolean
  onToggleDetails: () => void
}) {
  const handleGoHome = () => {
    window.location.href = '/'
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '50vh',
        p: 3,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 4,
          maxWidth: 480,
          textAlign: 'center',
          border: '1px solid',
          borderColor: 'error.light',
          borderRadius: 2,
          bgcolor: 'background.paper',
        }}
      >
        <ErrorOutlineIcon
          sx={{
            fontSize: 64,
            color: 'error.main',
            mb: 2,
          }}
        />

        <Typography variant="h5" gutterBottom sx={{ color: colors.deepBlue }}>
          Something went wrong
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          We encountered an unexpected error. Please try again or refresh the page.
        </Typography>

        <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 2 }}>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={resetErrorBoundary}
            sx={{
              bgcolor: colors.deepBlue,
              '&:hover': { bgcolor: colors.skyBlue },
            }}
          >
            Try Again
          </Button>

          {showHomeButton && (
            <Button
              variant="outlined"
              startIcon={<HomeIcon />}
              onClick={handleGoHome}
              sx={{
                borderColor: colors.deepBlue,
                color: colors.deepBlue,
              }}
            >
              Go Home
            </Button>
          )}
        </Stack>

        <Button
          size="small"
          onClick={onToggleDetails}
          endIcon={showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          sx={{ color: 'text.secondary' }}
        >
          Technical Details
        </Button>

        <Collapse in={showDetails}>
          <Box
            sx={{
              mt: 2,
              p: 2,
              bgcolor: 'grey.100',
              borderRadius: 1,
              textAlign: 'left',
              overflow: 'auto',
              maxHeight: 200,
            }}
          >
            <Typography
              variant="caption"
              component="pre"
              sx={{
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                m: 0,
              }}
            >
              {error.name}: {error.message}
              {error.stack && (
                <>
                  {'\n\n'}
                  {error.stack}
                </>
              )}
            </Typography>
          </Box>
        </Collapse>
      </Paper>
    </Box>
  )
}

/**
 * React Error Boundary that catches errors in child components.
 *
 * @example
 * ```tsx
 * <ErrorBoundary onError={(error) => logError(error)}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      showDetails: false,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to console for debugging
    console.error('[ErrorBoundary] Caught error:', error)
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack)

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)
  }

  handleReset = (): void => {
    this.props.onReset?.()
    this.setState({
      hasError: false,
      error: null,
      showDetails: false,
    })
  }

  handleToggleDetails = (): void => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }))
  }

  render(): ReactNode {
    const { hasError, error, showDetails } = this.state
    const { children, fallback: FallbackComponent, showHomeButton = true } = this.props

    if (hasError && error) {
      if (FallbackComponent) {
        return <FallbackComponent error={error} resetErrorBoundary={this.handleReset} />
      }

      return (
        <DefaultFallback
          error={error}
          resetErrorBoundary={this.handleReset}
          showHomeButton={showHomeButton}
          showDetails={showDetails}
          onToggleDetails={this.handleToggleDetails}
        />
      )
    }

    return children
  }
}

export default ErrorBoundary
