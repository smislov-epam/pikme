export function computeBackoffDelayMs(params: {
  attempt: number
  initialDelayMs: number
  maxDelayMs: number
}): number {
  const attemptIndex = Math.max(0, params.attempt)
  const base = Math.max(0, params.initialDelayMs)
  const cap = Math.max(base, params.maxDelayMs)

  // Exponential backoff: base * 2^attempt (capped)
  const delay = base * Math.pow(2, attemptIndex)
  return Math.min(delay, cap)
}
