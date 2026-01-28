/**
 * BGG Game Fetcher - Extract game data from BoardGameGeek URLs
 * 
 * Strategy:
 * 1. Try BGG XML API /thing endpoint (public game data, may work without auth)
 * 2. Fall back to HTML page scraping
 * 3. User completes any missing fields
 */

import type { BggThingDetails } from './types'
import { parseThingXml } from './parseThingXml'
import { fetchQueuedXml, hasBggApiKey } from './bggClient'
import type { PartialGameInfo } from './partialGameInfo'
import { extractFromHtml } from './bggHtmlExtractors'
import { sleep } from '../http/sleep'
import { isFirebaseAvailable } from '../firebase/config'
import { callFunction } from '../firebase/callFunction'

const BGG_URL_REGEX = /boardgamegeek\.com\/boardgame\/(\d+)/i

const HTML_FETCH_TIMEOUT_MS = 30_000
const HTML_FETCH_MAX_ATTEMPTS = 2

/**
 * BGG HTML Proxy request/response types (must match Firebase Function)
 */
interface BggHtmlProxyRequest {
  bggId: number
}

interface BggHtmlProxyResponse {
  html: string
  status: number
}

function isRetriableStatus(status: number): boolean {
  return status === 408 || status === 429 || status === 502 || status === 503 || status === 504
}

function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  if (err instanceof DOMException) return err.name === 'AbortError'
  if (err instanceof Error) return err.name === 'AbortError'
  return false
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()

  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    window.clearTimeout(timer)
  }
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: { timeoutMs: number; maxAttempts: number; retryDelayMs: number },
): Promise<Response> {
  const { timeoutMs, maxAttempts, retryDelayMs } = options

  let lastError: unknown = undefined
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetchWithTimeout(url, init, timeoutMs)

      if (response.ok) return response
      if (!isRetriableStatus(response.status) || attempt === maxAttempts) return response

      await sleep(retryDelayMs * attempt)
    } catch (err) {
      lastError = err
      if (!isAbortError(err) || attempt === maxAttempts) throw err
      await sleep(retryDelayMs * attempt)
    }
  }

  // Should be unreachable, but keep types happy.
  throw lastError instanceof Error ? lastError : new Error('HTML fetch failed after retries.')
}

export function extractBggIdFromUrl(url: string): number | null {
  const match = url.match(BGG_URL_REGEX)
  if (!match) return null
  return parseInt(match[1], 10)
}

export function isValidBggUrl(url: string): boolean {
  return BGG_URL_REGEX.test(url)
}

export type { PartialGameInfo } from './partialGameInfo'

/**
 * Fetch game info from BGG using multiple strategies
 */
export async function fetchPartialGameInfo(url: string): Promise<PartialGameInfo> {
  const bggId = extractBggIdFromUrl(url)
  if (!bggId) {
    throw new Error('Invalid BGG URL. Expected format: boardgamegeek.com/boardgame/12345/game-name')
  }

  // Strategy 1: Try BGG XML API (most reliable, but requires API key in some environments).
  // If no API key is configured, skip XML entirely and go straight to HTML scraping.
  if (hasBggApiKey()) {
    try {
      const xmlData = await fetchFromXmlApi(bggId)
      if (xmlData && xmlData.name) {
        return xmlData
      }
    } catch (error) {
      console.warn('[BGG] XML API failed:', error)
    }
  }

  // Strategy 2: Try HTML page scraping
  try {
    const htmlData = await fetchFromHtmlPage(bggId)
    if (htmlData && (htmlData.name || htmlData.thumbnail)) {
      return htmlData
    }
  } catch (error) {
    console.warn('[BGG] HTML scraping failed:', error)
  }

  // Return just the ID if all else fails
  return { bggId }
}

/**
 * Strategy 1: Fetch from BGG XML API /thing endpoint
 */
async function fetchFromXmlApi(bggId: number): Promise<PartialGameInfo | null> {
  // Only use our proxy so we can safely attach Authorization header (if present).
  try {
    const apiUrl = `/bgg-api/xmlapi2/thing?id=${bggId}&stats=1`

    // Use the shared BGG client so API keys (Bearer token) are applied when available.
    const xml = await fetchQueuedXml(apiUrl, {
      maxRetries: 3,
      initialDelayMs: 500,
      maxDelayMs: 4000,
    })

    if (!xml.includes('<error>') && !xml.includes('<message>')) {
      const games = parseThingXml(xml)
      if (games.length > 0) {
        return gameToPartialInfo(games[0])
      }
    }
  } catch (error) {
    console.warn('[BGG] XML API (local proxy) failed:', error)
  }

  return null
}

function gameToPartialInfo(game: BggThingDetails): PartialGameInfo {
  return {
    bggId: game.bggId,
    name: game.name,
    thumbnail: game.thumbnail,
    yearPublished: game.yearPublished,
    minPlayers: game.minPlayers,
    maxPlayers: game.maxPlayers,
    bestWith: game.bestWith,
    playingTimeMinutes: game.playingTimeMinutes,
    minPlayTimeMinutes: game.minPlayTimeMinutes,
    maxPlayTimeMinutes: game.maxPlayTimeMinutes,
    minAge: game.minAge,
    averageRating: game.averageRating,
    weight: game.weight,
    categories: game.categories,
    mechanics: game.mechanics,
    description: game.description,
  }
}

/**
 * Strategy 2: Fetch and scrape HTML page
 */
async function fetchFromHtmlPage(bggId: number): Promise<PartialGameInfo> {
  // Try our development proxy first (only works in dev via Vite)
  try {
    const proxyUrl = `/bgg-api/boardgame/${bggId}`
    const response = await fetchWithRetry(
      proxyUrl,
      { headers: { 'Accept': 'text/html' } },
      { timeoutMs: HTML_FETCH_TIMEOUT_MS, maxAttempts: HTML_FETCH_MAX_ATTEMPTS, retryDelayMs: 500 },
    )

    if (response.ok) {
      const html = await response.text()
      const data = extractFromHtml(html, bggId)
      if (data.name) return data
    }
  } catch (error) {
    console.warn('[BGG] Local proxy failed:', error)
  }

  // Try Firebase Cloud Function proxy (works in production when Firebase is enabled)
  if (isFirebaseAvailable()) {
    try {
      const response = await callFunction<BggHtmlProxyRequest, BggHtmlProxyResponse>(
        'bggHtmlProxy',
        { bggId }
      )

      if (response.html && response.status === 200) {
        const data = extractFromHtml(response.html, bggId)
        if (data.name) return data
      }
    } catch (error) {
      console.warn('[BGG] Firebase HTML proxy failed:', error)
    }
  }

  // Try alternative CORS proxy services as last resort
  const corsProxies = [
    // cors.sh - Reliable, open-source CORS proxy
    (url: string) => `https://cors.sh/${url}`,
    // corsproxy.io - Another reliable alternative
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  ]

  const bggUrl = `https://boardgamegeek.com/boardgame/${bggId}`

  for (const proxyFn of corsProxies) {
    try {
      const corsProxyUrl = proxyFn(bggUrl)
      
      const response = await fetchWithRetry(
        corsProxyUrl,
        { headers: { 'Accept': 'text/html' } },
        { timeoutMs: HTML_FETCH_TIMEOUT_MS, maxAttempts: HTML_FETCH_MAX_ATTEMPTS, retryDelayMs: 750 },
      )

      if (response.ok) {
        const html = await response.text()
        const data = extractFromHtml(html, bggId)
        if (data.name) {
          return data
        }
      }
    } catch (error) {
      console.warn('[BGG] CORS proxy failed:', error)
    }
  }

  return { bggId }
}

/**
 * Convert partial info to full game details
 */
export function toGameDetails(
  partial: PartialGameInfo,
  manual: { name?: string; minPlayers?: number; maxPlayers?: number; playingTimeMinutes?: number } = {}
): BggThingDetails {
  return {
    bggId: partial.bggId,
    name: manual.name || partial.name || `Game #${partial.bggId}`,
    yearPublished: partial.yearPublished,
    thumbnail: partial.thumbnail,
    minPlayers: manual.minPlayers ?? partial.minPlayers,
    maxPlayers: manual.maxPlayers ?? partial.maxPlayers,
    bestWith: partial.bestWith,
    playingTimeMinutes: manual.playingTimeMinutes ?? partial.playingTimeMinutes,
    minPlayTimeMinutes: partial.minPlayTimeMinutes,
    maxPlayTimeMinutes: partial.maxPlayTimeMinutes,
    minAge: partial.minAge,
    averageRating: partial.averageRating,
    weight: partial.weight,
    categories: partial.categories,
    mechanics: partial.mechanics,
    description: partial.description,
  }
}
