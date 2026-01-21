import { callFunction, callFunctionNoRetry } from '../firebase'
import type {
  ClaimSlotResult,
  SessionGameInfo,
  SharedGamePreference,
  SharedPreferencesResult,
} from './types'

export async function claimSessionSlot(
  sessionId: string,
  displayName: string,
  participantId?: string,
): Promise<ClaimSlotResult> {
  const result = await callFunctionNoRetry<
    { sessionId: string; displayName: string; participantId?: string },
    { ok: boolean; participantId: string; sessionId: string; hasSharedPreferences: boolean }
  >('claimSessionSlot', { sessionId, displayName, participantId })

  return {
    participantId: result.participantId,
    sessionId: result.sessionId,
    hasSharedPreferences: result.hasSharedPreferences,
  }
}

export async function setGuestReady(sessionId: string): Promise<void> {
  await callFunction<{ sessionId: string }, { ok: boolean }>('setGuestReady', { sessionId })
}

export async function getSessionGames(sessionId: string): Promise<SessionGameInfo[]> {
  const result = await callFunction<
    { sessionId: string },
    {
      ok: boolean
      games: Array<{
        gameId: string
        name: string
        minPlayers: number | null
        maxPlayers: number | null
        playingTimeMinutes: number | null
        thumbnail: string | null
        image: string | null
        mechanics: string[]
        categories: string[]
        source: 'bgg' | 'custom'
      }>
    }
  >('getSessionGames', { sessionId })

  return result.games
}

export async function getSharedPreferences(sessionId: string): Promise<SharedPreferencesResult> {
  const result = await callFunction<
    { sessionId: string },
    {
      ok: boolean
      hasPreferences: boolean
      preferences: SharedGamePreference[]
      displayName: string | null
    }
  >('getSharedPreferences', { sessionId })

  return {
    hasPreferences: result.hasPreferences,
    preferences: result.preferences,
    displayName: result.displayName,
  }
}

export async function submitGuestPreferences(
  sessionId: string,
  preferences: SharedGamePreference[],
  forLocalUser?: { participantId: string; displayName: string },
): Promise<{ preferencesCount: number }> {
  const result = await callFunction<
    { sessionId: string; preferences: SharedGamePreference[]; forLocalUser?: { participantId: string; displayName: string } },
    { ok: boolean; preferencesCount: number }
  >('submitGuestPreferences', { sessionId, preferences, forLocalUser })

  return { preferencesCount: result.preferencesCount }
}
