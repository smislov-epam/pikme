import type { BggThingId } from './types'

/**
 * Determines if we're in development mode (Vite dev server).
 * In dev, we use Vite's proxy; in production, we use Firebase Function proxy.
 */
export function isDevelopment(): boolean {
  return import.meta.env.DEV === true
}

// Use Vite proxy in development to avoid CORS issues
// In production, we'll use Firebase Functions proxy (see fetchQueuedXml)
const DEFAULT_BGG_BASE = '/bgg-api/xmlapi2'

export function getBggBaseUrl(baseUrl?: string): string {
  return (baseUrl ?? DEFAULT_BGG_BASE).replace(/\/$/, '')
}

function buildUrl(basePath: string, endpoint: string, params: Record<string, string>): string {
  const searchParams = new URLSearchParams(params)
  return `${basePath}/${endpoint}?${searchParams.toString()}`
}

export function buildCollectionUrl(params: {
  username: string
  baseUrl?: string
  ownedOnly?: boolean
  includeStats?: boolean
  excludeExpansions?: boolean
}): string {
  const base = getBggBaseUrl(params.baseUrl)
  const queryParams: Record<string, string> = {
    username: params.username,
  }

  if (params.ownedOnly ?? true) queryParams.own = '1'
  if (params.includeStats ?? true) queryParams.stats = '1'
  if (params.excludeExpansions ?? true) queryParams.excludesubtype = 'boardgameexpansion'

  return buildUrl(base, 'collection', queryParams)
}

export function buildThingUrl(params: {
  ids: BggThingId[]
  baseUrl?: string
  includeStats?: boolean
}): string {
  const base = getBggBaseUrl(params.baseUrl)
  const queryParams: Record<string, string> = {
    id: params.ids.join(','),
  }

  if (params.includeStats ?? true) queryParams.stats = '1'

  return buildUrl(base, 'thing', queryParams)
}

export function buildSearchUrl(params: {
  query: string
  type?: 'boardgame' | 'boardgameexpansion'
  exact?: boolean
  baseUrl?: string
}): string {
  const base = getBggBaseUrl(params.baseUrl)
  const queryParams: Record<string, string> = {
    query: params.query,
    type: params.type ?? 'boardgame',
  }

  if (params.exact) queryParams.exact = '1'

  return buildUrl(base, 'search', queryParams)
}