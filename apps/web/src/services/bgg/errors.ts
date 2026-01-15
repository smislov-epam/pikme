/**
 * BGG API error classes.
 * 
 * Separated from bggClient to enable clean imports without circular dependencies.
 */

/**
 * Thrown when BGG returns a 202 "queued" response after exhausting retries.
 */
export class BggQueuedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BggQueuedError'
  }
}

/**
 * Thrown when BGG returns 401 Unauthorized.
 * May indicate invalid/expired API key or private collection access.
 */
export class BggAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BggAuthError'
  }
}

/**
 * Thrown when BGG returns 429 Too Many Requests.
 */
export class BggRateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BggRateLimitError'
  }
}

/**
 * Thrown when a BGG username is not found.
 */
export class BggUserNotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BggUserNotFoundError'
  }
}
