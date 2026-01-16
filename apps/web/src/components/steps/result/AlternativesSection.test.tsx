import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { theme } from '../../../theme/theme'
import { AlternativesSection } from './AlternativesSection'
import type { GameWithScore } from '../ResultStep'

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)
}

describe('AlternativesSection', () => {
  it('renders simplified rows without match reasons chips', () => {
    const alternatives: GameWithScore[] = [
      {
        game: { bggId: 1, name: 'Catan', minPlayers: 3, maxPlayers: 4, lastFetchedAt: new Date().toISOString() },
        score: 4,
        matchReasons: ['Co-op', 'Short'],
      },
    ]

    renderWithTheme(
      <AlternativesSection
        alternatives={alternatives}
        maxScore={5}
        layoutMode="simplified"
        onPromoteAlternative={() => {}}
        onOpenDetails={() => {}}
      />,
    )

    expect(screen.getByText('#2')).toBeInTheDocument()
    expect(screen.getByText('4.0 pts')).toBeInTheDocument()
    expect(screen.queryByText('Co-op')).not.toBeInTheDocument()
    expect(screen.queryByText('Short')).not.toBeInTheDocument()
  })
})
