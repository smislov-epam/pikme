import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { ThemeProvider } from '@mui/material/styles'
import { theme } from '../../theme/theme'
import { GamePreviewGrid } from './GamePreviewGrid'

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)
}

describe('GamePreviewGrid', () => {
  it('renders Add New Games action even when there are no games yet', () => {
    const onToggle = vi.fn()

    renderWithTheme(
      <GamePreviewGrid
        games={[]}
        sessionGames={[]}
        gameOwners={{}}
        totalGames={0}
        users={[]}
        showAddNewGamesAction
        addNewGamesPanelOpen={false}
        onToggleAddNewGamesPanel={onToggle}
      />,
    )

    expect(screen.getByText('No games yet')).toBeInTheDocument()

    const btn = screen.getByRole('button', { name: 'Add New Games to Collection' })
    expect(btn).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(btn)
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('reflects open/closed state via aria-expanded', () => {
    const onToggle = vi.fn()

    const { rerender } = renderWithTheme(
      <GamePreviewGrid
        games={[]}
        sessionGames={[]}
        gameOwners={{}}
        totalGames={0}
        users={[]}
        showAddNewGamesAction
        addNewGamesPanelOpen={false}
        onToggleAddNewGamesPanel={onToggle}
      />,
    )

    expect(screen.getByRole('button', { name: 'Add New Games to Collection' })).toHaveAttribute('aria-expanded', 'false')

    rerender(
      <ThemeProvider theme={theme}>
        <GamePreviewGrid
          games={[]}
          sessionGames={[]}
          gameOwners={{}}
          totalGames={0}
          users={[]}
          showAddNewGamesAction
          addNewGamesPanelOpen
          onToggleAddNewGamesPanel={onToggle}
        />
      </ThemeProvider>,
    )

    expect(screen.getByRole('button', { name: 'Add New Games to Collection' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('shows Layout toggle in the Session header when provided', () => {
    const onLayoutModeChange = vi.fn()

    renderWithTheme(
      <GamePreviewGrid
        games={[]}
        sessionGames={[]}
        gameOwners={{}}
        totalGames={1}
        users={[]}
        layoutMode="standard"
        onLayoutModeChange={onLayoutModeChange}
      />,
    )

    const toggle = screen.getByRole('button', { name: /Layout:\s*Standard/i })
    expect(toggle).toBeInTheDocument()

    fireEvent.click(toggle)
    expect(onLayoutModeChange).toHaveBeenCalledWith('simplified')
  })
})
