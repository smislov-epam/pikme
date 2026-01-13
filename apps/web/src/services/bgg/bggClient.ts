import { sleep } from '../http/sleep'
import { computeBackoffDelayMs } from './backoff'

export interface FetchQueuedXmlOptions {
  maxRetries: number
  initialDelayMs: number
  maxDelayMs: number
  signal?: AbortSignal
  apiKey?: string
}

export class BggQueuedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BggQueuedError'
  }
}

export class BggAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BggAuthError'
  }
}

export class BggRateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BggRateLimitError'
  }
}

// Get API key from environment or localStorage
function getBggApiKey(providedKey?: string): string | undefined {
  if (providedKey) return providedKey
  // Check for environment variable (set in .env file)
  if (import.meta.env.VITE_BGG_API_KEY) return import.meta.env.VITE_BGG_API_KEY
  // Check localStorage for user-provided key
  return localStorage.getItem('bgg_api_key') ?? undefined
}

export function setBggApiKey(key: string): void {
  localStorage.setItem('bgg_api_key', key)
}

export function clearBggApiKey(): void {
  localStorage.removeItem('bgg_api_key')
}

export function hasBggApiKey(): boolean {
  return !!getBggApiKey()
}

export async function fetchQueuedXml(url: string, options: FetchQueuedXmlOptions): Promise<string> {
  const { maxRetries, initialDelayMs, maxDelayMs, signal, apiKey } = options
  const token = getBggApiKey(apiKey)

  const headers: Record<string, string> = {
    'Accept': 'text/xml, application/xml',
    // Some APIs require a User-Agent
    'User-Agent': 'PIKME-BoardGameSelector/1.0',
  }

  // Only add auth header if we have a valid API key - BGG public API works without it
  if (token && token.length > 0) {
    headers['Authorization'] = `Bearer ${token}`
    console.log('[BGG] Using API key for authentication')
  } else {
    console.log('[BGG] No API key - using public API')
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, { headers, signal })

    // 401 can happen for private collections or if rate limited
    // BGG public API should work without auth for public data
    if (response.status === 401) {
      if (token) {
        // If we had a token and got 401, it might be invalid
        throw new BggAuthError(
          'BGG API authentication failed. Your API key may be invalid or expired. ' +
          'Try clearing it in settings to use the public API.'
        )
      }
      // No token - some endpoints may now require an API key even for public game data
      throw new BggAuthError(
        'BGG returned 401 Unauthorized. Some endpoints may require an API key. ' +
        'Add an API key in settings and try again.'
      )
    }

    // 429 = Rate limited
    if (response.status === 429) {
      if (attempt === maxRetries) {
        throw new BggRateLimitError(
          'BGG API rate limit exceeded. Try again in a few minutes, or add an API key ' +
          'in settings for higher rate limits.'
        )
      }
      const delayMs = computeBackoffDelayMs({ attempt, initialDelayMs, maxDelayMs })
      await sleep(delayMs)
      continue
    }

    if (response.status === 202) {
      if (attempt === maxRetries) {
        throw new BggQueuedError('BGG is still preparing data (HTTP 202) after maximum retries.')
      }

      const delayMs = computeBackoffDelayMs({ attempt, initialDelayMs, maxDelayMs })
      await sleep(delayMs)
      continue
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`BGG request failed (${response.status} ${response.statusText}). ${body}`.trim())
    }

    return await response.text()
  }

  throw new Error('Unexpected BGG polling loop termination.')
}
