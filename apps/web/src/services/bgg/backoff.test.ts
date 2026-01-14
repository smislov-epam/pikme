import { computeBackoffDelayMs } from './backoff'

describe('computeBackoffDelayMs', () => {
  it('uses exponential backoff and caps at maxDelayMs', () => {
    expect(computeBackoffDelayMs({ attempt: 0, initialDelayMs: 1000, maxDelayMs: 15000 })).toBe(1000)
    expect(computeBackoffDelayMs({ attempt: 1, initialDelayMs: 1000, maxDelayMs: 15000 })).toBe(2000)
    expect(computeBackoffDelayMs({ attempt: 2, initialDelayMs: 1000, maxDelayMs: 15000 })).toBe(4000)
    expect(computeBackoffDelayMs({ attempt: 10, initialDelayMs: 1000, maxDelayMs: 15000 })).toBe(15000)
  })
})
