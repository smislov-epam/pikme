import { CssBaseline } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { Navigate, Route, Routes } from 'react-router-dom'
import WizardPage from './pages/WizardPage'
import { RegistrationPage } from './pages/RegistrationPage'
import { LoginPage } from './pages/LoginPage'
import { SessionJoinPage } from './pages/SessionJoinPage'
import { SessionGuestPage } from './pages/SessionGuestPage'
import { SessionsPage } from './pages/SessionsPage'
import { DbGate } from './components/DbGate'
import { LocalOwnerGate } from './components/gates/LocalOwnerGate'
import { ErrorBoundary } from './components/ErrorBoundary'
import { theme } from './theme/theme'
import { ToastProvider } from './services/toast'

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <ToastProvider>
          <ErrorBoundary>
            <Routes>
              <Route path="/register" element={<RegistrationPage />} />
              <Route path="/login" element={<LoginPage />} />

              <Route
                path="/sessions"
                element={
                  <DbGate>
                    <SessionsPage />
                  </DbGate>
                }
              />

              <Route
                path="/session/:sessionId/preferences"
                element={
                  <DbGate>
                    <LocalOwnerGate>
                      <SessionGuestPage />
                    </LocalOwnerGate>
                  </DbGate>
                }
              />

              <Route
                path="/session/:sessionId"
                element={
                  <DbGate>
                    <SessionJoinPage />
                  </DbGate>
                }
              />

              <Route
                path="/"
                element={
                  <DbGate>
                    <LocalOwnerGate>
                      <WizardPage />
                    </LocalOwnerGate>
                  </DbGate>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </ToastProvider>
      </LocalizationProvider>
    </ThemeProvider>
  )
}
