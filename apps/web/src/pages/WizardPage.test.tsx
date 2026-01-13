import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { theme } from '../theme/theme'
import WizardPage from './WizardPage'
import { ToastProvider } from '../services/toast'

// Mock the database and BGG services to avoid IndexedDB issues in tests
vi.mock('../services/db', () => ({
  getAllUsers: vi.fn().mockResolvedValue([]),
  getLocalUsers: vi.fn().mockResolvedValue([]),
  getUser: vi.fn().mockResolvedValue(undefined),
  getGames: vi.fn().mockResolvedValue([]),
  getGamesForUsers: vi.fn().mockResolvedValue([]),
  getGameOwners: vi.fn().mockResolvedValue({}),
  getUserPreferences: vi.fn().mockResolvedValue([]),
  getUserGames: vi.fn().mockResolvedValue([]),
  createLocalUser: vi.fn().mockResolvedValue({ username: 'test', isBggUser: false }),
  setUserAsOrganizer: vi.fn().mockResolvedValue(undefined),
  saveNight: vi.fn().mockResolvedValue({}),
  getSavedNights: vi.fn().mockResolvedValue([]),
  getSavedNight: vi.fn().mockResolvedValue(null),
  addGameToUser: vi.fn().mockResolvedValue(undefined),
  removeGameFromUser: vi.fn().mockResolvedValue(undefined),
  updateGamePreference: vi.fn().mockResolvedValue({}),
  saveUserPreferences: vi.fn().mockResolvedValue({}),
  deleteUserPreference: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../services/bgg/bggService', () => ({
  syncUserCollectionToDb: vi.fn().mockResolvedValue({ games: [], user: {} }),
  searchGames: vi.fn().mockResolvedValue([]),
  addGameToUserCollection: vi.fn().mockResolvedValue({}),
  addGameFromBggUrl: vi.fn().mockResolvedValue({ bggId: 1, name: 'Test Game' }),
}))

vi.mock('../services/bgg/bggClient', () => ({
  hasBggApiKey: vi.fn().mockReturnValue(false),
  BggAuthError: class BggAuthError extends Error {},
  BggRateLimitError: class BggRateLimitError extends Error {},
}))

function renderWithTheme(ui: React.ReactElement) {
  return render(
    <ThemeProvider theme={theme}>
      <ToastProvider>{ui}</ToastProvider>
    </ThemeProvider>
  )
}

describe('WizardPage', () => {
  it('renders the wizard with PIKME branding and stepper', () => {
    renderWithTheme(<WizardPage />)

    // Check branding
    expect(screen.getByText('PIKME')).toBeInTheDocument()

    // Check stepper labels are present
    expect(screen.getByText('Players')).toBeInTheDocument()
    expect(screen.getByText('Filters')).toBeInTheDocument()
    expect(screen.getByText('Preferences')).toBeInTheDocument()
    expect(screen.getByText('Result')).toBeInTheDocument()

    // Check initial step content
    expect(screen.getByText("Who's playing tonight?")).toBeInTheDocument()

    // Check navigation buttons
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled() // Disabled until users are added
  })
})
