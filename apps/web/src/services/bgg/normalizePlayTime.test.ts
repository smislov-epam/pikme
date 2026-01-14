import { normalizePlayTime } from './normalizePlayTime'

describe('normalizePlayTime', () => {
  it('copies average to min/max when only average exists', () => {
    expect(normalizePlayTime({ playingTimeMinutes: 60 })).toEqual({
      playingTimeMinutes: 60,
      minPlayTimeMinutes: 60,
      maxPlayTimeMinutes: 60,
    })
  })

  it('computes average when min/max exist and average missing', () => {
    expect(normalizePlayTime({ minPlayTimeMinutes: 45, maxPlayTimeMinutes: 75 })).toEqual({
      playingTimeMinutes: 60,
      minPlayTimeMinutes: 45,
      maxPlayTimeMinutes: 75,
    })
  })

  it('preserves explicit fields when present', () => {
    expect(normalizePlayTime({ playingTimeMinutes: 50, minPlayTimeMinutes: 40, maxPlayTimeMinutes: 60 })).toEqual({
      playingTimeMinutes: 50,
      minPlayTimeMinutes: 40,
      maxPlayTimeMinutes: 60,
    })
  })
})
