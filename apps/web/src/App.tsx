import { CssBaseline } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import WizardPage from './pages/WizardPage'
import { RegistrationPage } from './pages/RegistrationPage'
import { LoginPage } from './pages/LoginPage'
import { DbGate } from './components/DbGate'
import { theme } from './theme/theme'
import { ToastProvider } from './services/toast'

/**
 * Simple path-based routing (no react-router needed for a few pages).
 */
function getPage(): 'wizard' | 'register' | 'login' {
  const path = window.location.pathname;
  if (path === '/register' || path === '/register/') {
    return 'register';
  }
  if (path === '/login' || path === '/login/') {
    return 'login';
  }
  return 'wizard';
}

export default function App() {
  const page = getPage();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ToastProvider>
        {page === 'register' ? (
          <RegistrationPage />
        ) : page === 'login' ? (
          <LoginPage />
        ) : (
          <DbGate>
            <WizardPage />
          </DbGate>
        )}
      </ToastProvider>
    </ThemeProvider>
  )
}
