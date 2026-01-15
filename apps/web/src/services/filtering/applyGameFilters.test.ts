import type { GameRecord } from '../../db/types'
import type { WizardFilters } from '../../store/wizardTypes'
import { applyGameFilters } from './applyGameFilters'

function makeGame(overrides: Partial<GameRecord>): GameRecord {
  return {
    bggId: overrides.bggId ?? 1,
    name: overrides.name ?? 'Game',
    lastFetchedAt: overrides.lastFetchedAt ?? new Date().toISOString(),
    ...overrides,
  }
}

const baseFilters: WizardFilters = {
  playerCount: 4,
  timeRange: { min: 0, max: 300 },
  mode: 'any',
  requireBestWithPlayerCount: false,
  excludeLowRatedThreshold: null,
  ageRange: { min: 0, max: 21 },
  complexityRange: { min: 1, max: 5 },
  ratingRange: { min: 0, max: 10 },
}

describe('applyGameFilters', () => {
  it('filters by age/complexity/rating ranges (unknown allowed)', () => {
    const games = [
      makeGame({ bggId: 1, minAge: 12, weight: 3.5, averageRating: 7.2 }),
      makeGame({ bggId: 2, minAge: 8, weight: 2.0, averageRating: 6.5 }),
      makeGame({ bggId: 3 }), // unknown fields
    ]

    const filtered = applyGameFilters(
      games,
      {
        ...baseFilters,
        ageRange: { min: 10, max: 14 },
        complexityRange: { min: 3, max: 4 },
        ratingRange: { min: 7, max: 8 },
      },
      {},
    )

    expect(filtered.map((g) => g.bggId)).toEqual([1, 3])
  })

  it('excludes games rated below threshold by any player', () => {
    const games = [makeGame({ bggId: 1 }), makeGame({ bggId: 2 })]

    const filtered = applyGameFilters(
      games,
      { ...baseFilters, excludeLowRatedThreshold: 7 },
      {
        alice: { 1: 8, 2: 6 },
        bob: { 2: 9 },
      },
    )

    expect(filtered.map((g) => g.bggId)).toEqual([1])
  })

  it('filters by mode using coop mechanics', () => {
    const games = [
      makeGame({ bggId: 1, mechanics: ['Cooperative Game'] }),
      makeGame({ bggId: 2, mechanics: ['Trick-taking'] }),
    ]

    expect(applyGameFilters(games, { ...baseFilters, mode: 'coop' }, {})).toHaveLength(1)
    expect(applyGameFilters(games, { ...baseFilters, mode: 'competitive' }, {})).toHaveLength(1)
  })

  it('filters by best-with player count when enabled', () => {
    const games = [
      makeGame({ bggId: 1, minPlayers: 2, maxPlayers: 6, bestWith: '4' }),
      makeGame({ bggId: 2, minPlayers: 2, maxPlayers: 6, bestWith: '3-4' }),
      makeGame({ bggId: 3, minPlayers: 2, maxPlayers: 6, bestWith: 'Best with 4 players' }),
      makeGame({ bggId: 4, minPlayers: 2, maxPlayers: 6, bestWith: '2, 5' }),
      makeGame({ bggId: 5, minPlayers: 2, maxPlayers: 6 }),
    ]

    const filtered = applyGameFilters(
      games,
      { ...baseFilters, playerCount: 4, requireBestWithPlayerCount: true },
      {},
    )

    expect(filtered.map((g) => g.bggId)).toEqual([1, 2, 3])
  })

  it('treats best-with ranges with an en dash as a range', () => {
    const games = [
      makeGame({ bggId: 1, minPlayers: 2, maxPlayers: 6, bestWith: '3–4' }),
      makeGame({ bggId: 2, minPlayers: 2, maxPlayers: 6, bestWith: '5–6' }),
    ]

    const filtered = applyGameFilters(
      games,
      { ...baseFilters, playerCount: 4, requireBestWithPlayerCount: true },
      {},
    )

    expect(filtered.map((g) => g.bggId)).toEqual([1])
  })
})
