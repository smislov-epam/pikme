/**
 * Cloud Function Retry Wrapper (REQ-107)
 *
 * Provides automatic retry with exponential backoff for Firebase Cloud Functions.
 * Handles transient failures gracefully while failing fast on permanent errors.
 */

import type { HttpsCallable, HttpsCallableResult } from 'firebase/functions'

/** Error codes that are retryable (transient failures) */
const RETRYABLE_ERROR_CODES = new Set([
  'unavailable',      // Service unavailable (503)
  'resource-exhausted', // Rate limited (429)
  'deadline-exceeded', // Timeout
  'internal',         // Internal server error (500) - may be transient
  'unknown',          // Unknown error - may be network issue
])

/** Error codes that should NOT be retried (permanent failures) */
const NON_RETRYABLE_ERROR_CODES = new Set([
  'invalid-argument',     // Bad request (400)
  'failed-precondition',  // Precondition failed
  'out-of-range',         // Out of range
  'unauthenticated',      // Not authenticated (401)
  'permission-denied',    // Not authorized (403)
  'not-found',            // Resource not found (404)
  'already-exists',       // Resource already exists
  'aborted',              // Operation aborted
  'cancelled',            // Operation cancelled
  'data-loss',            // Data loss (unrecoverable)
  'unimplemented',        // Not implemented
])

export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number
  /** Base delay in milliseconds before first retry (default: 1000) */
  baseDelayMs?: number
  /** Maximum delay in milliseconds between retries (default: 10000) */
  maxDelayMs?: number
  /** Jitter factor (0-1) to randomize delays (default: 0.1) */
  jitterFactor?: number
  /** Custom function to determine if an error is retryable */
  isRetryable?: (error: unknown) => boolean
  /** Called before each retry attempt */
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void
}

const DEFAULT_CONFIG: Required<Omit<RetryConfig, 'isRetryable' | 'onRetry'>> = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  jitterFactor: 0.1,
}

/**
 * Extracts error code from Firebase Functions error.
 */
function getErrorCode(error: unknown): string | null {
  if (error && typeof error === 'object') {
    // Firebase Functions errors have a 'code' property
    if ('code' in error && typeof error.code === 'string') {
      // Remove 'functions/' prefix if present
      return error.code.replace('functions/', '')
    }
  }
  return null
}

/**
 * Determines if an error is retryable based on its code.
 */
export function isRetryableError(error: unknown): boolean {
  // Network errors (TypeError: Failed to fetch)
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true
  }

  const code = getErrorCode(error)
  if (!code) {
    // Unknown error structure - might be network error
    return true
  }

  // Explicitly non-retryable
  if (NON_RETRYABLE_ERROR_CODES.has(code)) {
    return false
  }

  // Explicitly retryable
  if (RETRYABLE_ERROR_CODES.has(code)) {
    return true
  }

  // Default to non-retryable for unknown codes
  return false
}

/**
 * Calculates delay with exponential backoff and jitter.
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  jitterFactor: number
): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt)

  // Cap at maximum delay
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs)

  // Add jitter to prevent thundering herd
  const jitter = cappedDelay * jitterFactor * (Math.random() * 2 - 1)

  return Math.max(0, Math.round(cappedDelay + jitter))
}

/**
 * Sleeps for the specified duration.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Wraps a Cloud Function call with retry logic.
 *
 * @example
 * ```typescript
 * const result = await callWithRetry(
 *   () => myCallable({ param: 'value' }),
 *   { maxAttempts: 3, onRetry: (attempt) => console.log(`Retry ${attempt}`) }
 * );
 * ```
 */
export async function callWithRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const {
    maxAttempts = DEFAULT_CONFIG.maxAttempts,
    baseDelayMs = DEFAULT_CONFIG.baseDelayMs,
    maxDelayMs = DEFAULT_CONFIG.maxDelayMs,
    jitterFactor = DEFAULT_CONFIG.jitterFactor,
    isRetryable = isRetryableError,
    onRetry,
  } = config

  let lastError: unknown

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Check if we should retry
      const shouldRetry = attempt < maxAttempts - 1 && isRetryable(error)

      if (!shouldRetry) {
        throw error
      }

      // Calculate delay
      const delayMs = calculateBackoffDelay(attempt, baseDelayMs, maxDelayMs, jitterFactor)

      // Notify about retry
      onRetry?.(attempt + 1, error, delayMs)

      // Log retry attempt
      console.warn(
        `[RetryWrapper] Attempt ${attempt + 1}/${maxAttempts} failed, retrying in ${delayMs}ms:`,
        getErrorCode(error) || error
      )

      // Wait before retrying
      await sleep(delayMs)
    }
  }

  // Should never reach here, but TypeScript needs this
  throw lastError
}

/**
 * Creates a retryable version of a Cloud Function callable.
 *
 * @example
 * ```typescript
 * const createSession = httpsCallable(functions, 'createSession');
 * const createSessionWithRetry = withRetry(createSession);
 *
 * const result = await createSessionWithRetry({ title: 'Game Night' });
 * ```
 */
export function withRetry<TRequest, TResponse>(
  callable: HttpsCallable<TRequest, TResponse>,
  config: RetryConfig = {}
): (data: TRequest) => Promise<HttpsCallableResult<TResponse>> {
  return (data: TRequest) => callWithRetry(() => callable(data), config)
}

/**
 * Type-safe wrapper for creating retryable Cloud Function calls.
 * Provides consistent retry behavior across all session service functions.
 */
export function createRetryableCall<TRequest, TResponse>(
  callable: HttpsCallable<TRequest, TResponse>,
  config?: RetryConfig
): (data: TRequest) => Promise<TResponse> {
  const retryableCallable = withRetry(callable, config)

  return async (data: TRequest): Promise<TResponse> => {
    const result = await retryableCallable(data)
    return result.data
  }
}
