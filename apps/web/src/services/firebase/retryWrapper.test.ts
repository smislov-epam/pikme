/**
 * Tests for Cloud Function Retry Wrapper (REQ-107)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  callWithRetry,
  isRetryableError,
  calculateBackoffDelay,
} from './retryWrapper'

describe('retryWrapper', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('isRetryableError', () => {
    it('returns true for network errors', () => {
      const error = new TypeError('Failed to fetch')
      expect(isRetryableError(error)).toBe(true)
    })

    it('returns true for unavailable error code', () => {
      const error = { code: 'functions/unavailable', message: 'Service unavailable' }
      expect(isRetryableError(error)).toBe(true)
    })

    it('returns true for resource-exhausted error code', () => {
      const error = { code: 'resource-exhausted', message: 'Rate limited' }
      expect(isRetryableError(error)).toBe(true)
    })

    it('returns true for internal error code', () => {
      const error = { code: 'internal', message: 'Internal error' }
      expect(isRetryableError(error)).toBe(true)
    })

    it('returns false for invalid-argument error code', () => {
      const error = { code: 'invalid-argument', message: 'Bad request' }
      expect(isRetryableError(error)).toBe(false)
    })

    it('returns false for unauthenticated error code', () => {
      const error = { code: 'unauthenticated', message: 'Not authenticated' }
      expect(isRetryableError(error)).toBe(false)
    })

    it('returns false for permission-denied error code', () => {
      const error = { code: 'permission-denied', message: 'Access denied' }
      expect(isRetryableError(error)).toBe(false)
    })

    it('returns false for not-found error code', () => {
      const error = { code: 'not-found', message: 'Not found' }
      expect(isRetryableError(error)).toBe(false)
    })

    it('returns true for unknown error structure (might be network)', () => {
      const error = { something: 'else' }
      expect(isRetryableError(error)).toBe(true)
    })

    it('strips functions/ prefix from error code', () => {
      const error = { code: 'functions/permission-denied', message: 'Denied' }
      expect(isRetryableError(error)).toBe(false)
    })
  })

  describe('calculateBackoffDelay', () => {
    it('calculates exponential backoff', () => {
      // With jitter = 0, we get exact values
      expect(calculateBackoffDelay(0, 1000, 10000, 0)).toBe(1000)
      expect(calculateBackoffDelay(1, 1000, 10000, 0)).toBe(2000)
      expect(calculateBackoffDelay(2, 1000, 10000, 0)).toBe(4000)
      expect(calculateBackoffDelay(3, 1000, 10000, 0)).toBe(8000)
    })

    it('caps delay at maxDelayMs', () => {
      expect(calculateBackoffDelay(10, 1000, 10000, 0)).toBe(10000)
    })

    it('adds jitter to delay', () => {
      // With jitter, values should vary but stay within bounds
      const delays = Array.from({ length: 100 }, () =>
        calculateBackoffDelay(1, 1000, 10000, 0.5)
      )

      // Base delay is 2000, jitter ±50% = 1000-3000
      const min = Math.min(...delays)
      const max = Math.max(...delays)

      expect(min).toBeGreaterThanOrEqual(1000)
      expect(max).toBeLessThanOrEqual(3000)
      expect(min).not.toBe(max) // Should have some variance
    })

    it('returns non-negative values', () => {
      const delay = calculateBackoffDelay(0, 100, 1000, 0.5)
      expect(delay).toBeGreaterThanOrEqual(0)
    })
  })

  describe('callWithRetry', () => {
    it('returns result on first success', async () => {
      const fn = vi.fn().mockResolvedValue('success')

      const result = await callWithRetry(fn)

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('retries on retryable error and succeeds', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce({ code: 'unavailable', message: 'Down' })
        .mockResolvedValueOnce('success')

      const promise = callWithRetry(fn, { baseDelayMs: 100, jitterFactor: 0 })

      // Run all timers and microtasks until promise resolves
      await vi.runAllTimersAsync()

      const result = await promise

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('throws immediately on non-retryable error', async () => {
      const error = { code: 'permission-denied', message: 'Access denied' }
      const fn = vi.fn().mockRejectedValue(error)

      await expect(callWithRetry(fn)).rejects.toEqual(error)
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('throws after max attempts exhausted', async () => {
      const error = { code: 'unavailable', message: 'Down' }
      const fn = vi.fn().mockRejectedValue(error)

      const promise = callWithRetry(fn, { maxAttempts: 3, baseDelayMs: 100, jitterFactor: 0 })

      // Run all timers to exhaust all attempts
      await vi.runAllTimersAsync()

      await expect(promise).rejects.toEqual(error)
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('calls onRetry callback before each retry', async () => {
      const error = { code: 'unavailable', message: 'Down' }
      const fn = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success')

      const onRetry = vi.fn()

      const promise = callWithRetry(fn, {
        maxAttempts: 3,
        baseDelayMs: 100,
        jitterFactor: 0,
        onRetry,
      })

      await vi.runAllTimersAsync()

      await promise

      expect(onRetry).toHaveBeenCalledTimes(2)
      expect(onRetry).toHaveBeenNthCalledWith(1, 1, error, 100)
      expect(onRetry).toHaveBeenNthCalledWith(2, 2, error, 200)
    })

    it('uses custom isRetryable function', async () => {
      const error = { code: 'custom-error', message: 'Custom' }
      const fn = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success')

      // Custom function that treats custom-error as retryable
      const isRetryable = (err: unknown) => {
        return (
          err !== null &&
          typeof err === 'object' &&
          'code' in err &&
          err.code === 'custom-error'
        )
      }

      const promise = callWithRetry(fn, { isRetryable, baseDelayMs: 100, jitterFactor: 0 })

      await vi.runAllTimersAsync()

      const result = await promise

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('handles network errors (TypeError)', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce('success')

      const promise = callWithRetry(fn, { baseDelayMs: 100, jitterFactor: 0 })

      // Run all timers until promise resolves
      await vi.runAllTimersAsync()

      const result = await promise

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('respects maxDelayMs cap', async () => {
      const error = { code: 'unavailable', message: 'Down' }
      const fn = vi.fn().mockRejectedValue(error)
      const onRetry = vi.fn()

      const promise = callWithRetry(fn, {
        maxAttempts: 5,
        baseDelayMs: 5000,
        maxDelayMs: 8000,
        jitterFactor: 0,
        onRetry,
      })

      // Run all timers to exhaust all attempts
      await vi.runAllTimersAsync()

      try {
        await promise
      } catch {
        // Expected to fail
      }

      // Check that delays are capped at 8000
      expect(onRetry).toHaveBeenNthCalledWith(1, 1, error, 5000)  // 5000 * 2^0 = 5000
      expect(onRetry).toHaveBeenNthCalledWith(2, 2, error, 8000)  // 5000 * 2^1 = 10000 -> capped at 8000
      expect(onRetry).toHaveBeenNthCalledWith(3, 3, error, 8000)  // Same cap
      expect(onRetry).toHaveBeenNthCalledWith(4, 4, error, 8000)  // Same cap
    })
  })
})
