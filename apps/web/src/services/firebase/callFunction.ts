/**
 * Cloud Function Call Helper (REQ-107)
 *
 * Provides a unified way to call Cloud Functions with:
 * - Automatic Firebase initialization checks
 * - Cached httpsCallable import
 * - Retry logic for transient failures
 */

import type { Functions, HttpsCallable, HttpsCallableResult } from 'firebase/functions'
import { getFunctionsInstance, isFirebaseInitialized } from './init'
import { callWithRetry, type RetryConfig } from './retryWrapper'

// Cache the httpsCallable function to avoid repeated imports
let httpsCallableCache: typeof import('firebase/functions').httpsCallable | null = null

/**
 * Gets the cached httpsCallable function, importing it if necessary.
 */
async function getHttpsCallable(): Promise<typeof import('firebase/functions').httpsCallable> {
  if (!httpsCallableCache) {
    const { httpsCallable } = await import('firebase/functions')
    httpsCallableCache = httpsCallable
  }
  return httpsCallableCache
}

/**
 * Ensures Firebase is ready and returns the Functions instance.
 * @throws Error if Firebase is not initialized or Functions not available
 */
function ensureFirebaseFunctions(): Functions {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase is not initialized')
  }

  const functions = getFunctionsInstance()
  if (!functions) {
    throw new Error('Firebase Functions not available')
  }

  return functions
}

/** Default retry configuration for Cloud Function calls */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  jitterFactor: 0.1,
}

/**
 * Calls a Cloud Function with automatic retry logic.
 *
 * This is the primary way to call Cloud Functions in the application.
 * It handles:
 * - Firebase initialization checks
 * - Cached imports
 * - Automatic retry with exponential backoff
 *
 * @example
 * ```typescript
 * const result = await callFunction<{ sessionId: string }, { ok: boolean; data: string }>(
 *   'getSessionData',
 *   { sessionId: '123' }
 * );
 * console.log(result.data);
 * ```
 */
export async function callFunction<TRequest, TResponse>(
  functionName: string,
  data: TRequest,
  retryConfig?: RetryConfig
): Promise<TResponse> {
  const functions = ensureFirebaseFunctions()
  const httpsCallable = await getHttpsCallable()

  const callable: HttpsCallable<TRequest, TResponse> = httpsCallable(functions, functionName)

  const result = await callWithRetry<HttpsCallableResult<TResponse>>(
    () => callable(data),
    { ...DEFAULT_RETRY_CONFIG, ...retryConfig }
  )

  return result.data
}

/**
 * Creates a typed Cloud Function caller for a specific function.
 *
 * Useful for creating reusable function callers with proper typing.
 *
 * @example
 * ```typescript
 * const createSession = createFunctionCaller<CreateSessionRequest, CreateSessionResponse>('createSession');
 *
 * // Later:
 * const result = await createSession({ title: 'Game Night' });
 * ```
 */
export function createFunctionCaller<TRequest, TResponse>(
  functionName: string,
  retryConfig?: RetryConfig
): (data: TRequest) => Promise<TResponse> {
  return (data: TRequest) => callFunction<TRequest, TResponse>(functionName, data, retryConfig)
}

/**
 * Calls a Cloud Function without retry logic.
 *
 * Use this for operations that should not be retried (e.g., mutations
 * that might have partially succeeded).
 */
export async function callFunctionNoRetry<TRequest, TResponse>(
  functionName: string,
  data: TRequest
): Promise<TResponse> {
  const functions = ensureFirebaseFunctions()
  const httpsCallable = await getHttpsCallable()

  const callable: HttpsCallable<TRequest, TResponse> = httpsCallable(functions, functionName)
  const result = await callable(data)

  return result.data
}
