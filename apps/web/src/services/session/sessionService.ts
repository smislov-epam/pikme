/**
 * Session Service (REQ-102, REQ-103, REQ-107)
 *
 * Client-side service for session creation and management.
 * Uses retry logic for transient failure handling.
 */

import { callFunction, callFunctionNoRetry } from '../firebase';
import type {
  CreateSessionOptions,
  CreateSessionResult,
  SessionGameData,
  SessionPreview,
  ClaimSlotResult,
  NamedParticipantData,
  SharedPreferencesResult,
  SharedGamePreference,
  NamedSlotInfo,
  SessionGameInfo,
  SessionMemberInfo,
  GuestPreferencesData,
  ParticipantPreferencesInfo,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Session Creation & Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new session via Cloud Function.
 *
 * Uses no-retry because session creation is not idempotent.
 *
 * @param options Session creation options
 * @returns Session ID and upload count
 * @throws Error if Firebase not initialized or user not authorized
 */
export async function createSession(
  options: CreateSessionOptions
): Promise<CreateSessionResult> {
  const result = await callFunctionNoRetry<
    {
      title?: string;
      scheduledFor: string;
      capacity?: number;
      minPlayers?: number | null;
      maxPlayers?: number | null;
      minPlayingTimeMinutes?: number | null;
      maxPlayingTimeMinutes?: number | null;
      hostDisplayName: string;
      shareMode?: 'quick' | 'detailed';
      showOtherParticipantsPicks?: boolean;
      gameIds: string[];
      games: SessionGameData[];
      namedParticipants?: NamedParticipantData[];
      hostPreferences?: SharedGamePreference[];
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
  });

  return {
    sessionId: result.sessionId,
    gamesUploaded: result.gamesUploaded,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Session Preview & Join
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get session preview for join page.
 *
 * @param sessionId The session ID
 * @returns Session preview data
 */
export async function getSessionPreview(
  sessionId: string
): Promise<SessionPreview> {
  const result = await callFunction<
    { sessionId: string },
    {
      ok: boolean;
      sessionId: string;
      title: string;
      hostName?: string;
      scheduledFor: string;
      minPlayers: number | null;
      maxPlayers: number | null;
      minPlayingTimeMinutes: number | null;
      maxPlayingTimeMinutes: number | null;
      gameCount: number;
      status: 'open' | 'closed' | 'expired';
      capacity: number;
      claimedCount: number;
      availableSlots: number;
      namedSlots: NamedSlotInfo[];
      shareMode?: 'quick' | 'detailed';
      showOtherParticipantsPicks?: boolean;
      hostUid: string;
      callerRole: 'host' | 'member' | 'guest' | null;
      callerParticipantId?: string;
      callerReady?: boolean;
      selectedGame?: {
        gameId: string;
        name: string;
        thumbnail: string | null;
        image: string | null;
        score: number;
        minPlayers: number | null;
        maxPlayers: number | null;
        playingTimeMinutes: number | null;
      };
      selectedAt?: string;
      result?: {
        gameId: string;
        name: string;
        thumbnail: string | null;
        image: string | null;
        score: number;
        minPlayers: number | null;
        maxPlayers: number | null;
        playingTimeMinutes: number | null;
      };
    }
  >('getSessionPreview', { sessionId });

  return {
    sessionId: result.sessionId,
    title: result.title,
    hostName: result.hostName,
    scheduledFor: new Date(result.scheduledFor),
    minPlayers: result.minPlayers,
    maxPlayers: result.maxPlayers,
    minPlayingTimeMinutes: result.minPlayingTimeMinutes,
    maxPlayingTimeMinutes: result.maxPlayingTimeMinutes,
    gameCount: result.gameCount,
    status: result.status,
    capacity: result.capacity,
    claimedCount: result.claimedCount,
    availableSlots: result.availableSlots,
    namedSlots: result.namedSlots ?? [],
    shareMode: result.shareMode ?? 'detailed',
    showOtherParticipantsPicks: result.showOtherParticipantsPicks,
    hostUid: result.hostUid,
    callerRole: result.callerRole,
    callerParticipantId: result.callerParticipantId,
    callerReady: result.callerReady,
    selectedGame: result.selectedGame,
    selectedAt: result.selectedAt ? new Date(result.selectedAt) : undefined,
    result: result.result,
  };
}

/**
 * Claim a session slot.
 *
 * Uses no-retry because slot claiming is not idempotent.
 *
 * @param sessionId The session ID
 * @param displayName Guest's display name
 * @param participantId Optional: claim a specific named slot
 * @returns Claim result
 */
export async function claimSessionSlot(
  sessionId: string,
  displayName: string,
  participantId?: string
): Promise<ClaimSlotResult> {
  const result = await callFunctionNoRetry<
    { sessionId: string; displayName: string; participantId?: string },
    { ok: boolean; participantId: string; sessionId: string; hasSharedPreferences: boolean }
  >('claimSessionSlot', { sessionId, displayName, participantId });

  return {
    participantId: result.participantId,
    sessionId: result.sessionId,
    hasSharedPreferences: result.hasSharedPreferences,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Guest Actions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mark guest as ready.
 *
 * @param sessionId The session ID
 */
export async function setGuestReady(sessionId: string): Promise<void> {
  await callFunction<{ sessionId: string }, { ok: boolean }>(
    'setGuestReady',
    { sessionId }
  );
}

/**
 * Get session games (for guests after joining).
 *
 * @param sessionId The session ID
 * @returns Array of game data (without owner info)
 */
export async function getSessionGames(sessionId: string): Promise<SessionGameInfo[]> {
  const result = await callFunction<
    { sessionId: string },
    {
      ok: boolean;
      games: Array<{
        gameId: string;
        name: string;
        minPlayers: number | null;
        maxPlayers: number | null;
        playingTimeMinutes: number | null;
        thumbnail: string | null;
        image: string | null;
        mechanics: string[];
        categories: string[];
        source: 'bgg' | 'custom';
      }>;
    }
  >('getSessionGames', { sessionId });

  return result.games;
}

/**
 * Get shared preferences for a claimed slot.
 *
 * @param sessionId The session ID
 * @returns Shared preferences if they exist
 */
export async function getSharedPreferences(sessionId: string): Promise<SharedPreferencesResult> {
  const result = await callFunction<
    { sessionId: string },
    {
      ok: boolean;
      hasPreferences: boolean;
      preferences: SharedGamePreference[];
      displayName: string | null;
    }
  >('getSharedPreferences', { sessionId });

  return {
    hasPreferences: result.hasPreferences,
    preferences: result.preferences,
    displayName: result.displayName,
  };
}

/**
 * Submit guest preferences to Firebase.
 *
 * @param sessionId The session ID
 * @param preferences Array of game preferences
 * @param forLocalUser Optional: host submitting on behalf of a local user
 * @returns Number of preferences submitted
 */
export async function submitGuestPreferences(
  sessionId: string,
  preferences: SharedGamePreference[],
  forLocalUser?: { participantId: string; displayName: string }
): Promise<{ preferencesCount: number }> {
  const result = await callFunction<
    { sessionId: string; preferences: SharedGamePreference[]; forLocalUser?: { participantId: string; displayName: string } },
    { ok: boolean; preferencesCount: number }
  >('submitGuestPreferences', { sessionId, preferences, forLocalUser });

  return {
    preferencesCount: result.preferencesCount,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Host Actions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get session members (host-only).
 *
 * @param sessionId The session ID
 * @returns Array of member info with ready status
 */
export async function getSessionMembers(sessionId: string): Promise<SessionMemberInfo[]> {
  const result = await callFunction<
    { sessionId: string },
    {
      ok: boolean;
      members: Array<{
        uid: string;
        displayName: string;
        role: 'host' | 'guest';
        ready: boolean;
        joinedAt: string;
      }>;
    }
  >('getSessionMembers', { sessionId });

  return result.members.map((m) => ({
    ...m,
    joinedAt: new Date(m.joinedAt),
  }));
}

/**
 * Remove a guest from a session (host-only).
 *
 * @param sessionId The session ID
 * @param guestUid The guest UID to remove
 */
export async function removeSessionGuest(sessionId: string, guestUid: string): Promise<void> {
  await callFunction<{ sessionId: string; guestUid: string }, { ok: boolean }>(
    'removeSessionGuest',
    { sessionId, guestUid }
  );
}

/**
 * Mark a participant as ready (host-only).
 *
 * Used when host marks a local player (sitting next to them) as ready.
 *
 * @param sessionId The session ID
 * @param participantId The participant ID to mark as ready
 */
export async function markParticipantReady(
  sessionId: string,
  participantId: string
): Promise<void> {
  await callFunction<{ sessionId: string; participantId: string }, { ok: boolean }>(
    'markParticipantReady',
    { sessionId, participantId }
  );
}

/**
 * Get all guest preferences for a session (host only).
 *
 * @param sessionId The session ID
 * @returns Array of guest preferences data
 */
export async function getAllGuestPreferences(sessionId: string): Promise<GuestPreferencesData[]> {
  const result = await callFunction<
    { sessionId: string },
    {
      ok: boolean;
      guests: Array<{
        uid: string;
        participantId: string;
        displayName: string;
        preferences: SharedGamePreference[];
        ready: boolean;
        updatedAt: string | null;
      }>;
    }
  >('getAllGuestPreferences', { sessionId });

  return result.guests;
}

/**
 * Get preferences of all ready participants in a session.
 * Available to any authenticated session member.
 *
 * @param sessionId The session ID
 * @returns Array of participant preferences (excludes calling user)
 */
export async function getReadyParticipantPreferences(sessionId: string): Promise<ParticipantPreferencesInfo[]> {
  const result = await callFunction<
    { sessionId: string },
    {
      ok: boolean;
      participants: ParticipantPreferencesInfo[];
    }
  >('getReadyParticipantPreferences', { sessionId });

  return result.participants;
}

/**
 * Tonight's Pick result to send when closing session.
 */
export interface CloseSessionResult {
  /** BGG game ID of the winning game */
  gameId: string;
  /** Game name */
  name: string;
  /** Thumbnail URL */
  thumbnail: string | null;
  /** Full-size image URL */
  image: string | null;
  /** Final score */
  score: number;
  /** Min players */
  minPlayers: number | null;
  /** Max players */
  maxPlayers: number | null;
  /** Playing time in minutes */
  playingTimeMinutes: number | null;
}

/**
 * Set the selected game on an open session (host only).
 * This notifies guests via realtime session doc updates.
 */
export async function setSessionSelectedGame(
  sessionId: string,
  selectedGame: CloseSessionResult
): Promise<{
  sessionId: string;
  status: 'open';
  selectedAt: Date;
}> {
  const response = await callFunction<
    { sessionId: string; selectedGame: CloseSessionResult },
    {
      ok: boolean;
      sessionId: string;
      status: 'open';
      selectedAt: string;
    }
  >('setSessionSelectedGame', { sessionId, selectedGame });

  return {
    sessionId: response.sessionId,
    status: response.status,
    selectedAt: new Date(response.selectedAt),
  };
}

/**
 * Close a session (host only).
 * This marks the session as closed and notifies guests.
 *
 * @param sessionId The session ID
 * @param result Optional Tonight's Pick result to store
 * @returns Close result with status
 */
export async function closeSession(
  sessionId: string,
  result?: CloseSessionResult
): Promise<{
  sessionId: string;
  status: 'closed';
  closedAt: Date;
}> {
  const response = await callFunction<
    { sessionId: string; result?: CloseSessionResult },
    {
      ok: boolean;
      sessionId: string;
      status: 'closed';
      closedAt: string;
    }
  >('closeSession', { sessionId, result });

  return {
    sessionId: response.sessionId,
    status: response.status,
    closedAt: new Date(response.closedAt),
  };
}

/**
 * Permanently delete a session (host only).
 *
 * @param sessionId The session ID
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await callFunction<{ sessionId: string }, { ok: boolean; sessionId: string }>('deleteSession', {
    sessionId,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a shareable session link.
 *
 * @param sessionId The session ID
 * @returns Full URL to join the session
 */
export function getSessionLink(sessionId: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/session/${sessionId}`;
}
