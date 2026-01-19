import { describe, expect, it } from 'vitest'
import { normalizeSessionWizardState, type SessionWizardState } from './wizardStateStorage'

describe('normalizeSessionWizardState', () => {
  it('treats rank 0 as undefined (legacy snapshots)', () => {
    const input: SessionWizardState = {
      usernames: ['alice'],
      sessionGameIds: [],
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
        alice: [{ bggId: 1, rank: 0, isTopPick: false, isDisliked: false }],
      },
      activeStep: 2,
      savedAt: new Date().toISOString(),
    }

    const out = normalizeSessionWizardState(input)
    expect(out.preferences.alice[0].rank).toBeUndefined()
  })

  it('keeps positive ranks intact', () => {
    const input: SessionWizardState = {
      usernames: ['alice'],
      sessionGameIds: [],
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
        alice: [{ bggId: 1, rank: 2, isTopPick: false, isDisliked: false }],
      },
      activeStep: 2,
      savedAt: new Date().toISOString(),
    }

    const out = normalizeSessionWizardState(input)
    expect(out.preferences.alice[0].rank).toBe(2)
  })
})
