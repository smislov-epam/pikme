import { fireEvent, render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { vi } from 'vitest'
import { theme } from '../../theme/theme'
import { ToastProvider } from '../../services/toast'
import type { GameRecord, UserRecord } from '../../db/types'
import { FiltersStep } from './FiltersStep'
import type { LayoutMode } from '../../services/storage/uiPreferences'

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

function renderFiltersStep(options: {
  timeRange: { min: number; max: number }
  onTimeRangeChange: (range: { min: number; max: number }) => void
  layoutMode?: LayoutMode
  onLayoutModeChange?: (mode: LayoutMode) => void
  games?: GameRecord[]
  filteredGames?: GameRecord[]
}) {
  const users: UserRecord[] = []
  const games: GameRecord[] = options.games ?? []
  const filteredGames: GameRecord[] = options.filteredGames ?? []

  return renderWithProviders(
    <FiltersStep
      games={games}
      users={users}
      gameOwners={{}}
      layoutMode={options.layoutMode ?? 'standard'}
      onLayoutModeChange={options.onLayoutModeChange ?? vi.fn()}
      sessionUserCount={0}
      playerCount={4}
      onPlayerCountChange={vi.fn()}
      timeRange={options.timeRange}
      onTimeRangeChange={options.onTimeRangeChange}
      mode={'any'}
      onModeChange={vi.fn()}
      requireBestWithPlayerCount={false}
      onRequireBestWithPlayerCountChange={vi.fn()}
      excludeLowRatedThreshold={null}
      onExcludeLowRatedChange={vi.fn()}
      ageRange={{ min: 0, max: 21 }}
      onAgeRangeChange={vi.fn()}
      complexityRange={{ min: 1, max: 5 }}
      onComplexityRangeChange={vi.fn()}
      ratingRange={{ min: 0, max: 10 }}
      onRatingRangeChange={vi.fn()}
      filteredGames={filteredGames}
      onExcludeGameFromSession={vi.fn()}
      onUndoExcludeGameFromSession={vi.fn()}
    />,
  )
}

describe('FiltersStep', () => {
  it('sets Long time preset to 90-180 minutes', () => {
    const onTimeRangeChange = vi.fn()

    renderFiltersStep({ timeRange: { min: 0, max: 30 }, onTimeRangeChange })

    fireEvent.click(screen.getByRole('button', { name: /Long/i }))

    expect(onTimeRangeChange).toHaveBeenCalledWith({ min: 90, max: 180 })
  })

  it('renders the Long preset description as 90-180 min', () => {
    renderFiltersStep({ timeRange: { min: 90, max: 180 }, onTimeRangeChange: vi.fn() })

    expect(screen.getByText('90-180 min')).toBeInTheDocument()
  })

  it('invokes onLayoutModeChange when Layout toggle clicked', () => {
    const onLayoutModeChange = vi.fn()

    renderFiltersStep({
      timeRange: { min: 0, max: 30 },
      onTimeRangeChange: vi.fn(),
      layoutMode: 'standard',
      onLayoutModeChange,
    })

    fireEvent.click(screen.getByLabelText('Layout: Standard'))
    expect(onLayoutModeChange).toHaveBeenCalledWith('simplified')
  })

  it('renders simplified preview list with “Remove from session” actions', () => {
    const games: GameRecord[] = [
      {
        bggId: 1,
        name: 'Catan',
        minPlayers: 3,
        maxPlayers: 4,
        minPlayTimeMinutes: 60,
        maxPlayTimeMinutes: 120,
        lastFetchedAt: new Date().toISOString(),
      },
    ]

    renderFiltersStep({
      timeRange: { min: 0, max: 300 },
      onTimeRangeChange: vi.fn(),
      layoutMode: 'simplified',
      games,
      filteredGames: games,
    })

    expect(screen.getByLabelText('Remove from session')).toBeInTheDocument()
    expect(screen.queryByLabelText('Exclude from session')).not.toBeInTheDocument()
  })
})
