import { CssBaseline } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import WizardPage from './pages/WizardPage'
import { theme } from './theme/theme'
import { ToastProvider } from './services/toast'

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ToastProvider>
        <WizardPage />
      </ToastProvider>
    </ThemeProvider>
  )
}
