import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { vi } from 'vitest'
import { useWizardState } from './useWizardState'

type DbService = typeof import('../services/db')

const { saveNightMock } = vi.hoisted(() => ({
  saveNightMock: vi.fn().mockResolvedValue({}),
}))

vi.mock('../services/db', async () => {
  const actual = (await vi.importActual('../services/db')) as DbService
  const FIXED_NOW = '2025-01-01T00:00:00.000Z'

  return {
    ...actual,
    getUser: vi.fn().mockResolvedValue({ username: 'u1', isBggUser: false, isOrganizer: true }),
    createLocalUser: vi.fn().mockResolvedValue({ username: 'u1', isBggUser: false, isOrganizer: true }),
    getGamesForUsers: vi.fn().mockResolvedValue([
      { bggId: 1, name: 'Alpha', minPlayers: 1, maxPlayers: 4, lastFetchedAt: FIXED_NOW },
      { bggId: 2, name: 'Bravo', minPlayers: 1, maxPlayers: 4, lastFetchedAt: FIXED_NOW },
      { bggId: 3, name: 'Charlie', minPlayers: 1, maxPlayers: 4, lastFetchedAt: FIXED_NOW },
    ]),
    getGameOwners: vi.fn().mockResolvedValue({}),
    getUserPreferences: vi.fn().mockResolvedValue([
      { username: 'u1', bggId: 1, rank: 1, isTopPick: false, isDisliked: false, updatedAt: FIXED_NOW },
      { username: 'u1', bggId: 2, rank: 2, isTopPick: false, isDisliked: false, updatedAt: FIXED_NOW },
      { username: 'u1', bggId: 3, rank: 3, isTopPick: false, isDisliked: false, updatedAt: FIXED_NOW },
    ]),
    getUserGames: vi.fn().mockResolvedValue([
      { username: 'u1', bggId: 1, rating: 8, source: 'manual', addedAt: FIXED_NOW },
      { username: 'u1', bggId: 2, rating: 7, source: 'manual', addedAt: FIXED_NOW },
      { username: 'u1', bggId: 3, rating: 6, source: 'manual', addedAt: FIXED_NOW },
    ]),
    getLocalUsers: vi.fn().mockResolvedValue([]),
    getSavedNights: vi.fn().mockResolvedValue([]),
    saveNight: saveNightMock,
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
    sessionGameIds: [1, 2, 3],
    excludedBggIds: [],
    filters: {
      playerCount: 4,
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

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await wizard.addLocalUser('u1')
      if (cancelled) return
      wizard.setPlayerCount(4)
      wizard.addGameToSession(1)
      wizard.addGameToSession(2)
      wizard.addGameToSession(3)
    })()
    return () => {
      cancelled = true
    }
  }, [wizard])

  return (
    <div>
      <div data-testid="top-pick-name">{wizard.recommendation.topPick?.game.name ?? 'none'}</div>
      <div data-testid="alt-names">{wizard.recommendation.alternatives.map((a) => a.game.name).join(',')}</div>

      <button type="button" onClick={() => wizard.promoteAlternativeToTopPick(2)}>
        Promote Bravo
      </button>
      <button type="button" onClick={() => wizard.saveNight('Night 1')}>
        Save
      </button>
    </div>
  )
}

describe('useWizardState promotion', () => {
  it('promotes an alternative to become the top pick', async () => {
    render(<Harness />)

    await waitFor(() => {
      expect(screen.getByTestId('top-pick-name')).toHaveTextContent('Alpha')
      expect(screen.getByTestId('alt-names')).toHaveTextContent('Bravo')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Promote Bravo' }))

    await waitFor(() => {
      expect(screen.getByTestId('top-pick-name')).toHaveTextContent('Bravo')
      expect(screen.getByTestId('alt-names')).toHaveTextContent('Alpha')
    })
  })

  it('saves the promoted pick as the night pick', async () => {
    saveNightMock.mockClear()
    render(<Harness />)

    await screen.findByText('Promote Bravo')

    fireEvent.click(screen.getByRole('button', { name: 'Promote Bravo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(saveNightMock).toHaveBeenCalled()
      expect(saveNightMock.mock.calls[0]?.[0]).toEqual(
        expect.objectContaining({
          pick: expect.objectContaining({ bggId: 2, name: 'Bravo' }),
        }),
      )
    })
  })
})
