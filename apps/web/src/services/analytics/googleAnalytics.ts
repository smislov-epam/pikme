import type { WizardFilters } from '../../store/wizardTypes'

const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined
const isProdBuild = import.meta.env.PROD
const analyticsEnabled = Boolean(isProdBuild && MEASUREMENT_ID)

let initialized = false

type GtagArgs = [string, ...unknown[]]

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: GtagArgs) => void
  }
}

export const isAnalyticsEnabled = analyticsEnabled

export function initializeGoogleAnalytics() {
  if (!analyticsEnabled || typeof window === 'undefined' || typeof document === 'undefined' || initialized) {
    return
  }

  window.dataLayer = window.dataLayer || []
  window.gtag =
    window.gtag ||
    function gtag(...args: GtagArgs) {
      window.dataLayer!.push(args)
    }

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`
  document.head.appendChild(script)

  window.gtag('js', new Date())
  window.gtag('config', MEASUREMENT_ID, { send_page_view: false })

  initialized = true
}

function getGtag() {
  if (!analyticsEnabled || typeof window === 'undefined') return null
  return window.gtag ?? null
}

function sanitizeParams(params?: Record<string, unknown>) {
  if (!params) return undefined
  const cleaned: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue
    cleaned[key] = value
  }
  return cleaned
}

function roundScore(score: number) {
  return Math.round(score * 10) / 10
}

function trackEvent(eventName: string, params?: Record<string, unknown>) {
  const gtag = getGtag()
  if (!gtag) return
  gtag('event', eventName, sanitizeParams(params) ?? {})
}

export function trackPageView(title?: string) {
  const gtag = getGtag()
  if (!gtag || typeof window === 'undefined') return
  const params: Record<string, unknown> = {
    page_location: window.location.href,
    page_path: window.location.pathname,
  }
  if (title) params.page_title = title
  gtag('event', 'page_view', params)
}

export function trackWizardStepView(stepName: string, context: {
  stepIndex: number
  playerCount: number
  sessionGames: number
  filteredGames: number
}) {
  // Track as both a custom event and a page view for better GA reporting
  trackPageView(`Pikme - ${stepName}`)
  trackEvent('wizard_step_view', {
    step_name: stepName,
    step_index: context.stepIndex,
    player_count: context.playerCount,
    session_games: context.sessionGames,
    filtered_games: context.filteredGames,
  })
}

export function trackTonightsPickReady(payload: {
  bggId: number
  name: string
  score: number
  matchReasons: string[]
  playerCount: number
  filters: WizardFilters
  alternativeCount: number
}) {
  trackEvent('tonights_pick_ready', {
    bgg_id: payload.bggId,
    game_name: payload.name,
    score: roundScore(payload.score),
    player_count: payload.playerCount,
    filters_mode: payload.filters.mode,
    filters_player_count: payload.filters.playerCount,
    filters_time_min: payload.filters.timeRange.min,
    filters_time_max: payload.filters.timeRange.max,
    alternative_count: payload.alternativeCount,
    match_reasons: payload.matchReasons.slice(0, 4).join('|'),
  })
}

export function trackAlternativePromoted(payload: {
  bggId: number
  name: string
  rank: number
  score: number
  playerCount: number
  filters: WizardFilters
}) {
  trackEvent('alternative_promoted', {
    bgg_id: payload.bggId,
    game_name: payload.name,
    promoted_rank: payload.rank,
    score: roundScore(payload.score),
    player_count: payload.playerCount,
    filters_mode: payload.filters.mode,
  })
}

/**
 * Tracks when a user saves a game night configuration.
 * Records information about the saved game night including player count,
 * number of games in the session, and metadata about the save action.
 *
 * @param payload - The game night save event data
 * @param payload.playerCount - Number of players in the game night
 * @param payload.sessionGames - Number of games in the session
 * @param payload.topPickName - Name of the recommended top pick game (if available)
 * @param payload.hasDescription - Whether the user provided a description for the saved night
 */
export function trackGameNightSaved(payload: {
  playerCount: number
  sessionGames: number
  topPickName?: string
  hasDescription: boolean
}) {
  trackEvent('game_night_saved', {
    player_count: payload.playerCount,
    session_games: payload.sessionGames,
    top_pick_name: payload.topPickName,
    has_description: payload.hasDescription,
  })
}
