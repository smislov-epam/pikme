import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { theme } from '../theme/theme'
import { HelpWalkthroughDialog } from './HelpWalkthroughDialog'

describe('HelpWalkthroughDialog', () => {
  it('renders section headers without numbered prefixes', () => {
    render(
      <ThemeProvider theme={theme}>
        <HelpWalkthroughDialog open={true} onClose={() => {}} />
      </ThemeProvider>,
    )

    expect(screen.getByRole('heading', { name: 'What PIKME does' })).toBeInTheDocument()
    expect(screen.queryByText(/^\d+\)/)).not.toBeInTheDocument()
  })

  it('renders key step tiles as headings', () => {
    render(
      <ThemeProvider theme={theme}>
        <HelpWalkthroughDialog open={true} onClose={() => {}} />
      </ThemeProvider>,
    )

    expect(screen.getByRole('heading', { name: 'Step 1 — Players' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Step 2 — Filters' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Step 3 — Preferences' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Step 4 — Result' })).toBeInTheDocument()
  })
})
