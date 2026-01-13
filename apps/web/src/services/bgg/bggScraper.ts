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

const BGG_URL_REGEX = /boardgamegeek\.com\/boardgame\/(\d+)/i

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

  console.log(`[BGG] Fetching game info for ID: ${bggId}`)

  // Strategy 1: Try BGG XML API (most reliable, but requires API key in some environments).
  // If no API key is configured, skip XML entirely and go straight to HTML scraping.
  if (hasBggApiKey()) {
    try {
      const xmlData = await fetchFromXmlApi(bggId)
      if (xmlData && xmlData.name) {
        console.log('[BGG] Successfully fetched from XML API:', xmlData)
        return xmlData
      }
    } catch (error) {
      console.warn('[BGG] XML API failed:', error)
    }
  } else {
    console.log('[BGG] No API key configured; skipping XML API and using HTML scraping')
  }

  // Strategy 2: Try HTML page scraping
  try {
    const htmlData = await fetchFromHtmlPage(bggId)
    if (htmlData && (htmlData.name || htmlData.thumbnail)) {
      console.log('[BGG] Successfully scraped from HTML:', htmlData)
      return htmlData
    }
  } catch (error) {
    console.warn('[BGG] HTML scraping failed:', error)
  }

  // Return just the ID if all else fails
  console.log('[BGG] All strategies failed, returning only bggId')
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
  // Try our proxy first
  try {
    const proxyUrl = `/bgg-api/boardgame/${bggId}`
    const response = await fetch(proxyUrl, {
      headers: { 'Accept': 'text/html' },
    })

    console.log(`[BGG] HTML page response status: ${response.status}`)

    if (response.ok) {
      const html = await response.text()
      const data = extractFromHtml(html, bggId)
      if (data.name) return data
    }
  } catch (error) {
    console.warn('[BGG] Local proxy failed:', error)
  }

  // Try public CORS proxy as fallback
  try {
    const bggUrl = `https://boardgamegeek.com/boardgame/${bggId}`
    const corsProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(bggUrl)}`
    
    console.log('[BGG] Trying public CORS proxy...')
    const response = await fetch(corsProxyUrl)

    if (response.ok) {
      const html = await response.text()
      const data = extractFromHtml(html, bggId)
      if (data.name) {
        console.log('[BGG] Public CORS proxy succeeded')
        return data
      }
    }
  } catch (error) {
    console.warn('[BGG] Public CORS proxy failed:', error)
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
