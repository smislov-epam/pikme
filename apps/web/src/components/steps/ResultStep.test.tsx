import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { vi } from 'vitest'
import { theme } from '../../theme/theme'
import { ToastProvider } from '../../services/toast'
import { ResultStep } from './ResultStep'

function setMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => {
      return {
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }
    },
  })
}

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ThemeProvider theme={theme}>
      <ToastProvider>{ui}</ToastProvider>
    </ThemeProvider>,
  )
}

describe('ResultStep responsive header copy', () => {
  const baseProps = {
    topPick: {
      game: { bggId: 1, name: 'Alpha', lastFetchedAt: new Date().toISOString() },
      score: 5,
      matchReasons: [],
    },
    alternatives: [],
    vetoed: [],
    filters: {
      playerCount: 4,
      timeRange: { min: 0, max: 300 },
      mode: 'any' as const,
      excludeLowRatedThreshold: null,
      ageRange: { min: 0, max: 21 },
      complexityRange: { min: 1, max: 5 },
      ratingRange: { min: 0, max: 10 },
    },
    users: [{ username: 'u1', isBggUser: false }],
    gameOwners: {},
    layoutMode: 'standard' as const,
    onLayoutModeChange: vi.fn(),
    onPromoteAlternative: vi.fn(),
    onSaveNight: vi.fn(),
  }

  it('hides header and subheader on narrow screens', () => {
    setMatchMedia(true)

    renderWithProviders(<ResultStep {...baseProps} />)

    expect(screen.queryByText('Your recommendation is ready!')).not.toBeInTheDocument()
    expect(screen.queryByText("Based on your group's preferences and filters")).not.toBeInTheDocument()
  })

  it('shows header and subheader on wider screens', () => {
    setMatchMedia(false)

    renderWithProviders(<ResultStep {...baseProps} />)

    expect(screen.getByText('Your recommendation is ready!')).toBeInTheDocument()
    expect(screen.getByText("Based on your group's preferences and filters")).toBeInTheDocument()
  })
})
