import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { vi } from 'vitest'
import { theme } from '../../../theme/theme'
import { ToastProvider } from '../../../services/toast'
import type { GameRecord, UserRecord } from '../../../db/types'
import { PreferencesStepContent } from './PreferencesStepContent'

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ThemeProvider theme={theme}>
      <ToastProvider>{ui}</ToastProvider>
    </ThemeProvider>,
  )
}

describe('PreferencesStepContent', () => {
  it('shows the Layout toggle and does not show deprecated quick actions', () => {
    const users: UserRecord[] = [{ username: 'alice', isBggUser: false }]
    const games: GameRecord[] = [{ bggId: 1, name: 'Catan', lastFetchedAt: new Date().toISOString() }]

    renderWithProviders(
      <PreferencesStepContent
        users={users}
        games={games}
        gameOwners={{}}
        layoutMode="standard"
        onLayoutModeChange={vi.fn()}
        preferences={{ alice: [] }}
        userRatings={{ alice: {} }}
        onUpdatePreference={vi.fn()}
        onReorderPreferences={vi.fn()}
        onClearPreference={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /Layout:\s*Standard/i })).toBeInTheDocument()
    expect(screen.queryByText(/Auto-sort by my rating/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Mark rest neutral/i)).not.toBeInTheDocument()
  })
})
