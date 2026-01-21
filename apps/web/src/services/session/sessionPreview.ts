import { callFunction } from '../firebase'
import { getCachedPreview, setCachedPreview } from './sessionPreviewCache'
import type { NamedSlotInfo, SessionPreview } from './types'

type PreviewResponse = {
  ok: boolean
  sessionId: string
  title: string
  hostName?: string
  scheduledFor: string
  minPlayers: number | null
  maxPlayers: number | null
  minPlayingTimeMinutes: number | null
  maxPlayingTimeMinutes: number | null
  gameCount: number
  status: 'open' | 'closed' | 'expired'
  capacity: number
  claimedCount: number
  availableSlots: number
  namedSlots?: NamedSlotInfo[]
  shareMode?: 'quick' | 'detailed'
  showOtherParticipantsPicks?: boolean
  hostUid: string
  callerRole: 'host' | 'member' | 'guest' | null
  callerParticipantId?: string
  callerReady?: boolean
  selectedGame?: {
    gameId: string
    name: string
    thumbnail: string | null
    image: string | null
    score: number
    minPlayers: number | null
    maxPlayers: number | null
    playingTimeMinutes: number | null
  }
  selectedAt?: string
  result?: {
    gameId: string
    name: string
    thumbnail: string | null
    image: string | null
    score: number
    minPlayers: number | null
    maxPlayers: number | null
    playingTimeMinutes: number | null
  }
}

function mapPreview(response: PreviewResponse): SessionPreview {
  return {
    sessionId: response.sessionId,
    title: response.title,
    hostName: response.hostName,
    scheduledFor: new Date(response.scheduledFor),
    minPlayers: response.minPlayers,
    maxPlayers: response.maxPlayers,
    minPlayingTimeMinutes: response.minPlayingTimeMinutes,
    maxPlayingTimeMinutes: response.maxPlayingTimeMinutes,
    gameCount: response.gameCount,
    status: response.status,
    capacity: response.capacity,
    claimedCount: response.claimedCount,
    availableSlots: response.availableSlots,
    namedSlots: response.namedSlots ?? [],
    shareMode: response.shareMode ?? 'detailed',
    showOtherParticipantsPicks: response.showOtherParticipantsPicks,
    hostUid: response.hostUid,
    callerRole: response.callerRole,
    callerParticipantId: response.callerParticipantId,
    callerReady: response.callerReady,
    selectedGame: response.selectedGame,
    selectedAt: response.selectedAt ? new Date(response.selectedAt) : undefined,
    result: response.result,
  }
}

/**
 * Get session preview for join page (cached).
 */
export async function getSessionPreview(sessionId: string, skipCache = false): Promise<SessionPreview> {
  if (!skipCache) {
    const cached = getCachedPreview(sessionId)
    if (cached) return cached
  }

  const response = await callFunction<{ sessionId: string }, PreviewResponse>('getSessionPreview', {
    sessionId,
  })

  const preview = mapPreview(response)
  setCachedPreview(sessionId, preview)
  return preview
}

/**
 * Generate a shareable session link.
 */
export function getSessionLink(sessionId: string): string {
  const baseUrl = window.location.origin
  return `${baseUrl}/session/${sessionId}`
}
