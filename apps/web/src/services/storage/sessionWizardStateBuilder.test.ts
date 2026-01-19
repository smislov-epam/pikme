import { describe, expect, it } from 'vitest'
import { buildSessionWizardStateSnapshot } from './sessionWizardStateBuilder'

describe('buildSessionWizardStateSnapshot', () => {
  it('preserves undefined rank (does not coerce to 0)', () => {
    const snapshot = buildSessionWizardStateSnapshot({
      users: [{ username: 'alice' }],
      sessionGameIds: [123],
      excludedBggIds: [],
      filters: {
        playerCount: 2,
        timeRange: { min: 0, max: 300 },
        mode: 'any',
        requireBestWithPlayerCount: false,
        excludeLowRatedThreshold: null,
        ageRange: { min: 0, max: 21 },
        complexityRange: { min: 1, max: 5 },
        ratingRange: { min: 0, max: 10 },
      },
      preferences: {
        alice: [{ bggId: 1, rank: undefined, isTopPick: false, isDisliked: false }],
      },
      activeStep: 2,
    })

    expect(snapshot.preferences.alice[0].rank).toBeUndefined()
  })

  it('converts null rank to undefined', () => {
    const snapshot = buildSessionWizardStateSnapshot({
      users: [{ username: 'alice' }],
      sessionGameIds: [123],
      excludedBggIds: [],
      filters: {
        playerCount: 2,
        timeRange: { min: 0, max: 300 },
        mode: 'any',
        requireBestWithPlayerCount: false,
        excludeLowRatedThreshold: null,
        ageRange: { min: 0, max: 21 },
        complexityRange: { min: 1, max: 5 },
        ratingRange: { min: 0, max: 10 },
      },
      preferences: {
        alice: [{ bggId: 1, rank: null, isTopPick: false, isDisliked: false }],
      },
      activeStep: 2,
    })

    expect(snapshot.preferences.alice[0].rank).toBeUndefined()
  })
})
