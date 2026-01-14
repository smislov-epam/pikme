import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { vi } from 'vitest'
import { theme } from '../../theme/theme'
import { WizardStepperNav } from './WizardStepperNav'

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

describe('WizardStepperNav compact mode', () => {
  it('renders current step label only on narrow screens and shows a games badge', () => {
    setMatchMedia(true)

    renderWithTheme(
      <WizardStepperNav
        activeStep={1}
        completedSteps={[true, false, false, false]}
        compactBadgeCount={7}
        canJumpTo={() => true}
        onSelectStep={vi.fn()}
      />,
    )

    expect(screen.getByText('Filters')).toBeInTheDocument()
    expect(screen.queryByText('Players')).not.toBeInTheDocument()
    expect(screen.queryByText('Preferences')).not.toBeInTheDocument()
    expect(screen.queryByText('Result')).not.toBeInTheDocument()

    expect(screen.getByRole('status', { name: 'Games count' })).toHaveTextContent('7')
  })

  it('renders the full stepper on wider screens', () => {
    setMatchMedia(false)

    renderWithTheme(
      <WizardStepperNav
        activeStep={0}
        completedSteps={[false, false, false, false]}
        compactBadgeCount={3}
        canJumpTo={() => true}
        onSelectStep={vi.fn()}
      />,
    )

    expect(screen.getByText('Players')).toBeInTheDocument()
    expect(screen.getByText('Filters')).toBeInTheDocument()
    expect(screen.getByText('Preferences')).toBeInTheDocument()
    expect(screen.getByText('Result')).toBeInTheDocument()
  })
})
