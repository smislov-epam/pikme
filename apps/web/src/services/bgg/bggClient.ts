import { sleep } from '../http/sleep'
import { computeBackoffDelayMs } from './backoff'
import { isDevelopment } from './bggUrls'
import { callFunction } from '../firebase/callFunction'

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

export class BggUserNotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BggUserNotFoundError'
  }
}

// Get API key from environment or localStorage
function getBggApiKey(providedKey?: string): string | undefined {
  if (providedKey) return providedKey
  // Check localStorage first for user-provided key (takes priority over env)
  const localKey = localStorage.getItem('bgg_api_key')
  if (localKey && localKey.trim().length > 0) return localKey.trim()
  // Fall back to environment variable (set in .env file)
  const envKey = import.meta.env.VITE_BGG_API_KEY
  if (envKey && envKey.trim().length > 0) return envKey.trim()
  return undefined
}

export function setBggApiKey(key: string): void {
  const trimmed = key.trim()
  if (trimmed.length > 0) {
    localStorage.setItem('bgg_api_key', trimmed)
  }
}

export function clearBggApiKey(): void {
  localStorage.removeItem('bgg_api_key')
}

export function hasBggApiKey(): boolean {
  return !!getBggApiKey()
}

/**
 * BGG Proxy request/response types (must match Firebase Function)
 */
interface BggProxyRequest {
  endpoint: string
  params: Record<string, string>
}

interface BggProxyResponse {
  xml: string
  status: number
}

/**
 * Parse URL into endpoint and params for the Firebase proxy.
 */
function parseUrlForProxy(url: string): { endpoint: string; params: Record<string, string> } {
  // URL is like: /bgg-api/xmlapi2/search?query=catan&type=boardgame
  const urlObj = new URL(url, 'http://localhost')
  const pathParts = urlObj.pathname.split('/')
  // Find the endpoint (last part after xmlapi2)
  const xmlapi2Index = pathParts.indexOf('xmlapi2')
  const endpoint = xmlapi2Index >= 0 ? pathParts[xmlapi2Index + 1] : pathParts[pathParts.length - 1]

  const params: Record<string, string> = {}
  urlObj.searchParams.forEach((value, key) => {
    params[key] = value
  })

  return { endpoint, params }
}

/**
 * Fetch BGG XML via Firebase Function proxy (for production).
 * The server-side function uses its own API key from Firebase secrets.
 */
async function fetchViaProxy(
  url: string,
  options: FetchQueuedXmlOptions
): Promise<string> {
  const { maxRetries, initialDelayMs, maxDelayMs } = options
  const { endpoint, params } = parseUrlForProxy(url)

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await callFunction<BggProxyRequest, BggProxyResponse>(
        'bggProxy',
        {
          endpoint,
          params,
        }
      )

      // Handle 202 (queued) - client should retry
      if (response.status === 202) {
        if (attempt === maxRetries) {
          throw new BggQueuedError('BGG is still preparing data (HTTP 202) after maximum retries.')
        }
        const delayMs = computeBackoffDelayMs({ attempt, initialDelayMs, maxDelayMs })
        await sleep(delayMs)
        continue
      }

      return response.xml
    } catch (error) {
      // Check for specific error codes from Firebase Function
      const errorMessage = error instanceof Error ? error.message : String(error)

      if (errorMessage.includes('resource-exhausted') || errorMessage.includes('rate limit')) {
        if (attempt === maxRetries) {
          throw new BggRateLimitError(
            'BGG API rate limit exceeded. Try again in a few minutes.'
          )
        }
        const delayMs = computeBackoffDelayMs({ attempt, initialDelayMs, maxDelayMs })
        await sleep(delayMs)
        continue
      }

      if (errorMessage.includes('unauthenticated') || errorMessage.includes('authentication failed')) {
        throw new BggAuthError(
          'BGG API authentication failed. Your API key may be invalid or expired.'
        )
      }

      // Re-throw other errors
      throw error
    }
  }

  throw new Error('Unexpected BGG proxy polling loop termination.')
}

/**
 * Fetch BGG XML directly (for development with Vite proxy).
 */
async function fetchDirect(url: string, options: FetchQueuedXmlOptions): Promise<string> {
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

/**
 * Fetch XML from BGG API with retry/backoff for 202 (queued) responses.
 *
 * In development, uses Vite proxy for CORS bypass.
 * In production, uses Firebase Function proxy.
 */
export async function fetchQueuedXml(url: string, options: FetchQueuedXmlOptions): Promise<string> {
  if (isDevelopment()) {
    return fetchDirect(url, options)
  }
  return fetchViaProxy(url, options)
}