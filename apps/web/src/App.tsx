import { CssBaseline } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import WizardPage from './pages/WizardPage'
import { RegistrationPage } from './pages/RegistrationPage'
import { LoginPage } from './pages/LoginPage'
import { SessionJoinPage } from './pages/SessionJoinPage'
import { DbGate } from './components/DbGate'
import { LocalOwnerGate } from './components/gates/LocalOwnerGate'
import { ErrorBoundary } from './components/ErrorBoundary'
import { theme } from './theme/theme'
import { ToastProvider } from './services/toast'

/**
 * Simple path-based routing (no react-router needed for a few pages).
 */
function getPage(): 'wizard' | 'register' | 'login' | 'session' {
  const path = window.location.pathname;
  if (path === '/register' || path === '/register/') {
    return 'register';
  }
  if (path === '/login' || path === '/login/') {
    return 'login';
  }
  if (path.startsWith('/session/')) {
    return 'session';
  }
  return 'wizard';
}

export default function App() {
  const page = getPage();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <ToastProvider>
          <ErrorBoundary>
            {page === 'register' ? (
              <RegistrationPage />
            ) : page === 'login' ? (
              <LoginPage />
            ) : page === 'session' ? (
              // Session join handles identity via invite flow (bypass local owner check)
              <DbGate>
                <SessionJoinPage />
              </DbGate>
            ) : (
              // Main wizard requires local owner setup
              <DbGate>
                <LocalOwnerGate>
                  <WizardPage />
                </LocalOwnerGate>
              </DbGate>
            )}
          </ErrorBoundary>
        </ToastProvider>
      </LocalizationProvider>
    </ThemeProvider>
  )
}
