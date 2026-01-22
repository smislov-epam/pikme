import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useWizardSaveNightAction } from './useWizardSaveNightAction'
import type { WizardState, WizardActions } from '../../hooks/useWizardState'

const dbMocks = vi.hoisted(() => ({
  saveNight: vi.fn(),
}))

const sessionMocks = vi.hoisted(() => ({
  setSessionSelectedGame: vi.fn(),
}))

vi.mock('../../services/db', () => dbMocks)
vi.mock('../../services/session', () => sessionMocks)

describe('useWizardSaveNightAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saves and publishes the current topPick (session-safe)', async () => {
    dbMocks.saveNight.mockResolvedValue({})
    sessionMocks.setSessionSelectedGame.mockResolvedValue({
      sessionId: 's1',
      status: 'open',
      selectedAt: new Date(),
    })

    const wizard = {
      users: [{ username: 'host', isOrganizer: true }],
      excludedBggIds: [],
      sessionGameIds: [1, 2],
      filters: {
        playerCount: 2,
        timeRange: { min: 0, max: 999 },
        mode: 'any',
        excludeLowRatedThreshold: null,
        ageRange: { min: 0, max: 99 },
        complexityRange: { min: 0, max: 5 },
        ratingRange: { min: 0, max: 10 },
      },
      recommendation: {
        topPick: {
          game: { bggId: 42, name: 'Game A', thumbnail: null, image: null, minPlayers: 1, maxPlayers: 4, playingTimeMinutes: 60 },
          score: 0.9,
          matchReasons: [],
        },
        alternatives: [
          { game: { bggId: 7, name: 'Game B' }, score: 0.8, matchReasons: [] },
        ],
        vetoed: [],
      },
      loadSavedNights: vi.fn().mockResolvedValue(undefined),
    } as unknown as WizardState & WizardActions

    const toast = {
      show: vi.fn(),
      success: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
    }

    const { result } = renderHook(() =>
      useWizardSaveNightAction({
        wizard,
        toast,
        activeSessionId: 's1',
      })
    )

    await act(async () => {
      await result.current('Night', 'Desc')
    })

    expect(dbMocks.saveNight).toHaveBeenCalledTimes(1)
    const savedPayload = dbMocks.saveNight.mock.calls[0]![0]
    expect(savedPayload.pick.bggId).toBe(42)
    expect(savedPayload.pick.name).toBe('Game A')

    expect(wizard.loadSavedNights).toHaveBeenCalledTimes(1)

    expect(sessionMocks.setSessionSelectedGame).toHaveBeenCalledWith('s1', expect.objectContaining({
      gameId: '42',
      name: 'Game A',
      score: 0.9,
    }))
  })
})
