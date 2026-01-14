import type { SavedNightRecord } from '../../db/types'
import { findReusableNight } from './findReusableNight'

type NightOverrides = Partial<Omit<SavedNightRecord, 'data'>> & {
  data?: Partial<SavedNightRecord['data']>
}

function night(overrides: NightOverrides): SavedNightRecord {
  return {
    id: overrides.id ?? 1,
    createdAt: overrides.createdAt ?? new Date('2025-01-01T00:00:00.000Z').toISOString(),
    data: {
      organizerUsername: overrides.data?.organizerUsername ?? 'Alice',
      name: overrides.data?.name ?? 'Night',
      usernames: overrides.data?.usernames ?? ['Alice', 'Bob'],
      gameIds: overrides.data?.gameIds ?? [1, 2, 3],
      filters: overrides.data?.filters ?? {},
      pick: overrides.data?.pick ?? { bggId: 1, name: 'G', score: 1 },
      alternatives: overrides.data?.alternatives ?? [],
    },
  }
}

describe('findReusableNight', () => {
  it('picks the most recent night matching organizer + player count', () => {
    const a = night({ id: 1, createdAt: '2025-01-01T00:00:00.000Z' })
    const b = night({ id: 2, createdAt: '2025-02-01T00:00:00.000Z' })

    const match = findReusableNight({ savedNights: [a, b], organizerUsername: 'Alice', playerCount: 2 })
    expect(match?.id).toBe(2)
  })

  it('returns null when no nights match', () => {
    const a = night({ id: 1, data: { organizerUsername: 'Alice', usernames: ['Alice', 'Bob'], gameIds: [1] } })

    expect(findReusableNight({ savedNights: [a], organizerUsername: 'Alice', playerCount: 3 })).toBeNull()
    expect(findReusableNight({ savedNights: [a], organizerUsername: 'Bob', playerCount: 2 })).toBeNull()
  })
})
