import { fireEvent, render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { vi } from 'vitest'
import { theme } from '../../../theme/theme'
import { VibeCard } from './VibeCard'

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

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)
}

describe('VibeCard', () => {
  it('renders compact labels on narrow screens', () => {
    setMatchMedia(true)

    renderWithTheme(<VibeCard mode="any" onModeChange={vi.fn()} />)

    expect(screen.getByText('Co-op')).toBeInTheDocument()
    expect(screen.getByText('Competitive')).toBeInTheDocument()
    expect(screen.getByText('Any')).toBeInTheDocument()

    expect(screen.queryByText('Work together')).not.toBeInTheDocument()
    expect(screen.queryByText('Every player for themselves')).not.toBeInTheDocument()
    expect(screen.queryByText('No preference')).not.toBeInTheDocument()
  })

  it('renders full descriptions on wider screens', () => {
    setMatchMedia(false)

    renderWithTheme(<VibeCard mode="any" onModeChange={vi.fn()} />)

    expect(screen.getByText('Work together')).toBeInTheDocument()
    expect(screen.getByText('Every player for themselves')).toBeInTheDocument()
    expect(screen.getByText('No preference')).toBeInTheDocument()
  })

  it('calls onModeChange when selecting a different vibe', () => {
    setMatchMedia(false)

    const onModeChange = vi.fn()
    renderWithTheme(<VibeCard mode="any" onModeChange={onModeChange} />)

    fireEvent.click(screen.getByRole('button', { name: /Competitive/i }))

    expect(onModeChange).toHaveBeenCalledWith('competitive')
  })
})
