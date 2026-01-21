import { callFunction, callFunctionNoRetry } from '../firebase'
import type {
  CloseSessionResult,
  CreateSessionOptions,
  CreateSessionResult,
  GuestPreferencesData,
  NamedParticipantData,
  ParticipantPreferencesInfo,
  SessionGameData,
  SessionMemberInfo,
  SharedGamePreference,
} from './types'

export async function createSession(options: CreateSessionOptions): Promise<CreateSessionResult> {
  const result = await callFunctionNoRetry<
    {
      title?: string
      scheduledFor: string
      capacity?: number
      minPlayers?: number | null
      maxPlayers?: number | null
      minPlayingTimeMinutes?: number | null
      maxPlayingTimeMinutes?: number | null
      hostDisplayName: string
      shareMode?: 'quick' | 'detailed'
      showOtherParticipantsPicks?: boolean
      gameIds: string[]
      games: SessionGameData[]
      namedParticipants?: NamedParticipantData[]
      hostPreferences?: SharedGamePreference[]
    },
    { ok: boolean; sessionId: string; gamesUploaded: number }
  >('createSession', {
    title: options.title,
    scheduledFor: options.scheduledFor.toISOString(),
    capacity: options.capacity,
    minPlayers: options.minPlayers,
    maxPlayers: options.maxPlayers,
    minPlayingTimeMinutes: options.minPlayingTimeMinutes,
    maxPlayingTimeMinutes: options.maxPlayingTimeMinutes,
    hostDisplayName: options.hostDisplayName,
    shareMode: options.shareMode,
    showOtherParticipantsPicks: options.showOtherParticipantsPicks,
    gameIds: options.games.map((g) => g.gameId),
    games: options.games,
    namedParticipants: options.namedParticipants,
    hostPreferences: options.hostPreferences,
  })

  return { sessionId: result.sessionId, gamesUploaded: result.gamesUploaded }
}

export async function getSessionMembers(sessionId: string): Promise<SessionMemberInfo[]> {
  const result = await callFunction<
    { sessionId: string },
    {
      ok: boolean
      members: Array<{
        uid: string
        displayName: string
        role: 'host' | 'guest'
        ready: boolean
        joinedAt: string
      }>
    }
  >('getSessionMembers', { sessionId })

  return result.members.map((member) => ({ ...member, joinedAt: new Date(member.joinedAt) }))
}

export async function removeSessionGuest(sessionId: string, guestUid: string): Promise<void> {
  await callFunction<{ sessionId: string; guestUid: string }, { ok: boolean }>('removeSessionGuest', {
    sessionId,
    guestUid,
  })
}

export async function markParticipantReady(sessionId: string, participantId: string): Promise<void> {
  await callFunction<{ sessionId: string; participantId: string }, { ok: boolean }>('markParticipantReady', {
    sessionId,
    participantId,
  })
}

export async function getAllGuestPreferences(sessionId: string): Promise<GuestPreferencesData[]> {
  const result = await callFunction<
    { sessionId: string },
    {
      ok: boolean
      guests: GuestPreferencesData[]
    }
  >('getAllGuestPreferences', { sessionId })

  return result.guests
}

export async function getReadyParticipantPreferences(sessionId: string): Promise<ParticipantPreferencesInfo[]> {
  const result = await callFunction<
    { sessionId: string },
    {
      ok: boolean
      participants: ParticipantPreferencesInfo[]
    }
  >('getReadyParticipantPreferences', { sessionId })

  return result.participants
}

export async function setSessionSelectedGame(
  sessionId: string,
  selectedGame: CloseSessionResult,
): Promise<{ sessionId: string; status: 'open'; selectedAt: Date }> {
  const response = await callFunction<
    { sessionId: string; selectedGame: CloseSessionResult },
    { ok: boolean; sessionId: string; status: 'open'; selectedAt: string }
  >('setSessionSelectedGame', { sessionId, selectedGame })

  return { sessionId: response.sessionId, status: response.status, selectedAt: new Date(response.selectedAt) }
}

export async function closeSession(
  sessionId: string,
  result?: CloseSessionResult,
): Promise<{ sessionId: string; status: 'closed'; closedAt: Date }> {
  const response = await callFunction<
    { sessionId: string; result?: CloseSessionResult },
    { ok: boolean; sessionId: string; status: 'closed'; closedAt: string }
  >('closeSession', { sessionId, result })

  return { sessionId: response.sessionId, status: response.status, closedAt: new Date(response.closedAt) }
}

export async function deleteSession(sessionId: string): Promise<void> {
  await callFunction<{ sessionId: string }, { ok: boolean; sessionId: string }>('deleteSession', { sessionId })
}
