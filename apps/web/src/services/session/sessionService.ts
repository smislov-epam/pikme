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
      gameIds: string[];
      games: SessionGameData[];
      namedParticipants?: NamedParticipantData[];
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
    gameIds: options.games.map((g) => g.gameId),
    games: options.games,
    namedParticipants: options.namedParticipants,
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
    }
  >('getSessionPreview', { sessionId });

  return {
    sessionId: result.sessionId,
    title: result.title,
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
 * @returns Number of preferences submitted
 */
export async function submitGuestPreferences(
  sessionId: string,
  preferences: SharedGamePreference[]
): Promise<{ preferencesCount: number }> {
  const result = await callFunction<
    { sessionId: string; preferences: SharedGamePreference[] },
    { ok: boolean; preferencesCount: number }
  >('submitGuestPreferences', { sessionId, preferences });

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
