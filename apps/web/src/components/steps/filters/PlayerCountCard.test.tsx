import { fireEvent, render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { vi } from 'vitest'
import { theme } from '../../../theme/theme'
import { PlayerCountCard } from './PlayerCountCard'

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)
}

describe('PlayerCountCard', () => {
  it('toggles the 12+ expansion to show 13-20 chips', () => {
    renderWithTheme(
      <PlayerCountCard sessionUserCount={4} playerCount={4} onPlayerCountChange={vi.fn()} />,
    )

    expect(screen.queryByText('13')).not.toBeInTheDocument()

    const toggle = screen.getByRole('button', { name: '12+' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(toggle)

    expect(screen.getByRole('button', { name: '13' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '20' })).toBeInTheDocument()
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })

  it('auto-expands when a 13+ player count is selected', () => {
    renderWithTheme(
      <PlayerCountCard sessionUserCount={4} playerCount={13} onPlayerCountChange={vi.fn()} />,
    )

    expect(screen.getByRole('button', { name: '13' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '20' })).toBeInTheDocument()

    const toggle = screen.getByRole('button', { name: '12+' })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })

  it('shows a non-blocking mismatch hint when selection exceeds configured players', () => {
    renderWithTheme(
      <PlayerCountCard sessionUserCount={4} playerCount={6} onPlayerCountChange={vi.fn()} />,
    )

    expect(
      screen.getByText('You selected 6 players, but only 4 profiles are configured.'),
    ).toBeInTheDocument()
  })

  it('auto-follows Players roster changes when user has not manually overridden', () => {
    const onPlayerCountChange = vi.fn()

    const { rerender } = renderWithTheme(
      <PlayerCountCard
        sessionUserCount={4}
        playerCount={4}
        onPlayerCountChange={onPlayerCountChange}
      />,
    )

    rerender(
      <ThemeProvider theme={theme}>
        <PlayerCountCard
          sessionUserCount={5}
          playerCount={4}
          onPlayerCountChange={onPlayerCountChange}
        />
      </ThemeProvider>,
    )

    expect(onPlayerCountChange).toHaveBeenCalledWith(5)
  })

  it('does not auto-follow roster changes after manual override', () => {
    const onPlayerCountChange = vi.fn()

    const { rerender } = renderWithTheme(
      <PlayerCountCard
        sessionUserCount={4}
        playerCount={4}
        onPlayerCountChange={onPlayerCountChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '6' }))
    expect(onPlayerCountChange).toHaveBeenCalledWith(6)

    onPlayerCountChange.mockClear()

    rerender(
      <ThemeProvider theme={theme}>
        <PlayerCountCard
          sessionUserCount={5}
          playerCount={6}
          onPlayerCountChange={onPlayerCountChange}
        />
      </ThemeProvider>,
    )

    expect(onPlayerCountChange).not.toHaveBeenCalled()
  })
})
