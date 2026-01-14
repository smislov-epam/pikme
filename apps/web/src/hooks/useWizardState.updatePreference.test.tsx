import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { useWizardState } from './useWizardState'

type DbService = typeof import('../services/db')

vi.mock('../services/db', async () => {
  const actual = (await vi.importActual('../services/db')) as DbService
  const FIXED_NOW = '2025-01-01T00:00:00.000Z'

  return {
    ...actual,
    getUser: vi.fn().mockResolvedValue({ username: 'u1', isBggUser: false, isOrganizer: true }),
    createLocalUser: vi.fn().mockResolvedValue({ username: 'u1', isBggUser: false, isOrganizer: true }),
    getGamesForUsers: vi.fn().mockResolvedValue([
      { bggId: 1, name: 'Alpha', minPlayers: 1, maxPlayers: 4, lastFetchedAt: FIXED_NOW },
    ]),
    getGameOwners: vi.fn().mockResolvedValue({}),
    getUserPreferences: vi.fn().mockResolvedValue([
      { username: 'u1', bggId: 1, rank: undefined, isTopPick: false, isDisliked: true, updatedAt: FIXED_NOW },
    ]),
    updateGamePreference: vi.fn().mockResolvedValue(undefined),
    getUserGames: vi.fn().mockResolvedValue([]),
    getLocalUsers: vi.fn().mockResolvedValue([]),
    getSavedNights: vi.fn().mockResolvedValue([]),
  }
})

vi.mock('../services/bgg/bggService', () => ({
  syncUserCollectionToDb: vi.fn(),
  searchGames: vi.fn(),
  addGameToUserCollection: vi.fn(),
  addGameFromBggUrl: vi.fn(),
}))

vi.mock('../services/storage/wizardStateStorage', () => ({
  loadWizardState: vi.fn().mockResolvedValue({
    version: 1,
    usernames: ['u1'],
    sessionGameIds: [1],
    excludedBggIds: [],
    filters: {
      playerCount: 2,
      timeRange: { min: 0, max: 300 },
      mode: 'any',
      excludeLowRatedThreshold: null,
      ageRange: { min: 0, max: 21 },
      complexityRange: { min: 1, max: 5 },
      ratingRange: { min: 0, max: 10 },
    },
  }),
  saveWizardState: vi.fn().mockResolvedValue(undefined),
  clearWizardState: vi.fn().mockResolvedValue(undefined),
}))

function Harness() {
  const wizard = useWizardState()
  const pref = (wizard.preferences.u1 ?? []).find((p) => p.bggId === 1)

  return (
    <div>
      <div data-testid="flags">{pref ? `${pref.isTopPick ? 'T' : 'F'}:${pref.isDisliked ? 'D' : 'N'}` : 'none'}</div>
      <button type="button" onClick={() => void wizard.updatePreference('u1', 1, { isTopPick: true })}>
        Make top pick
      </button>
    </div>
  )
}

describe('useWizardState.updatePreference', () => {
  it('applies exclusivity rules in optimistic UI updates', async () => {
    render(<Harness />)

    await waitFor(() => {
      expect(screen.getByTestId('flags')).toHaveTextContent('F:D')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Make top pick' }))

    await waitFor(() => {
      expect(screen.getByTestId('flags')).toHaveTextContent('T:N')
    })
  })
})
