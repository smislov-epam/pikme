/**
 * Session Service (REQ-102, REQ-103)
 *
 * Client-side service for session creation and management.
 */

import { getFunctionsInstance, isFirebaseInitialized } from '../firebase';
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
} from './types';

/**
 * Create a new session via Cloud Function.
 *
 * @param options Session creation options
 * @returns Session ID and upload count
 * @throws Error if Firebase not initialized or user not authorized
 */
export async function createSession(
  options: CreateSessionOptions
): Promise<CreateSessionResult> {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase is not initialized');
  }

  const functions = getFunctionsInstance();
  if (!functions) {
    throw new Error('Firebase Functions not available');
  }

  // Import httpsCallable dynamically
  const { httpsCallable } = await import('firebase/functions');

  const createSessionFn = httpsCallable<
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
  >(functions, 'createSession');

  const result = await createSessionFn({
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
    sessionId: result.data.sessionId,
    gamesUploaded: result.data.gamesUploaded,
  };
}

/**
 * Get session preview for join page.
 *
 * @param sessionId The session ID
 * @returns Session preview data
 */
export async function getSessionPreview(
  sessionId: string
): Promise<SessionPreview> {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase is not initialized');
  }

  const functions = getFunctionsInstance();
  if (!functions) {
    throw new Error('Firebase Functions not available');
  }

  const { httpsCallable } = await import('firebase/functions');

  const fn = httpsCallable<
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
  >(functions, 'getSessionPreview');

  const result = await fn({ sessionId });

  return {
    sessionId: result.data.sessionId,
    title: result.data.title,
    scheduledFor: new Date(result.data.scheduledFor),
    minPlayers: result.data.minPlayers,
    maxPlayers: result.data.maxPlayers,
    minPlayingTimeMinutes: result.data.minPlayingTimeMinutes,
    maxPlayingTimeMinutes: result.data.maxPlayingTimeMinutes,
    gameCount: result.data.gameCount,
    status: result.data.status,
    capacity: result.data.capacity,
    claimedCount: result.data.claimedCount,
    availableSlots: result.data.availableSlots,
    namedSlots: result.data.namedSlots ?? [],
    shareMode: result.data.shareMode ?? 'detailed',
  };
}

/**
 * Claim a session slot.
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
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase is not initialized');
  }

  const functions = getFunctionsInstance();
  if (!functions) {
    throw new Error('Firebase Functions not available');
  }

  const { httpsCallable } = await import('firebase/functions');

  const fn = httpsCallable<
    { sessionId: string; displayName: string; participantId?: string },
    { ok: boolean; participantId: string; sessionId: string; hasSharedPreferences: boolean }
  >(functions, 'claimSessionSlot');

  const result = await fn({ sessionId, displayName, participantId });

  return {
    participantId: result.data.participantId,
    sessionId: result.data.sessionId,
    hasSharedPreferences: result.data.hasSharedPreferences,
  };
}

/**
 * Mark guest as ready.
 *
 * @param sessionId The session ID
 */
export async function setGuestReady(sessionId: string): Promise<void> {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase is not initialized');
  }

  const functions = getFunctionsInstance();
  if (!functions) {
    throw new Error('Firebase Functions not available');
  }

  const { httpsCallable } = await import('firebase/functions');

  const fn = httpsCallable<{ sessionId: string }, { ok: boolean }>(
    functions,
    'setGuestReady'
  );

  await fn({ sessionId });
}

/**
 * Get session games (for guests after joining).
 *
 * @param sessionId The session ID
 * @returns Array of game data (without owner info)
 */
export async function getSessionGames(
  sessionId: string
): Promise<import('./types').SessionGameInfo[]> {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase is not initialized');
  }

  const functions = getFunctionsInstance();
  if (!functions) {
    throw new Error('Firebase Functions not available');
  }

  const { httpsCallable } = await import('firebase/functions');

  const fn = httpsCallable<
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
  >(functions, 'getSessionGames');

  const result = await fn({ sessionId });
  return result.data.games;
}

/**
 * Get session members (host-only).
 *
 * @param sessionId The session ID
 * @returns Array of member info with ready status
 */
export async function getSessionMembers(
  sessionId: string
): Promise<import('./types').SessionMemberInfo[]> {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase is not initialized');
  }

  const functions = getFunctionsInstance();
  if (!functions) {
    throw new Error('Firebase Functions not available');
  }

  const { httpsCallable } = await import('firebase/functions');

  const fn = httpsCallable<
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
  >(functions, 'getSessionMembers');

  const result = await fn({ sessionId });

  return result.data.members.map((m) => ({
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
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase is not initialized');
  }

  const functions = getFunctionsInstance();
  if (!functions) {
    throw new Error('Firebase Functions not available');
  }

  const { httpsCallable } = await import('firebase/functions');

  const fn = httpsCallable<{ sessionId: string; guestUid: string }, { ok: boolean }>(
    functions,
    'removeSessionGuest'
  );

  await fn({ sessionId, guestUid });
}

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

/**
 * Get shared preferences for a claimed slot.
 *
 * @param sessionId The session ID
 * @returns Shared preferences if they exist
 */
export async function getSharedPreferences(
  sessionId: string
): Promise<SharedPreferencesResult> {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase is not initialized');
  }

  const functions = getFunctionsInstance();
  if (!functions) {
    throw new Error('Firebase Functions not available');
  }

  const { httpsCallable } = await import('firebase/functions');

  const fn = httpsCallable<
    { sessionId: string },
    {
      ok: boolean;
      hasPreferences: boolean;
      preferences: SharedGamePreference[];
      displayName: string | null;
    }
  >(functions, 'getSharedPreferences');

  const result = await fn({ sessionId });

  return {
    hasPreferences: result.data.hasPreferences,
    preferences: result.data.preferences,
    displayName: result.data.displayName,
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
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase is not initialized');
  }

  const functions = getFunctionsInstance();
  if (!functions) {
    throw new Error('Firebase Functions not available');
  }

  const { httpsCallable } = await import('firebase/functions');

  const fn = httpsCallable<
    { sessionId: string; preferences: SharedGamePreference[] },
    { ok: boolean; preferencesCount: number }
  >(functions, 'submitGuestPreferences');

  const result = await fn({ sessionId, preferences });

  return {
    preferencesCount: result.data.preferencesCount,
  };
}

/**
 * Get all guest preferences for a session (host only).
 *
 * @param sessionId The session ID
 * @returns Array of guest preferences data
 */
export async function getAllGuestPreferences(
  sessionId: string
): Promise<import('./types').GuestPreferencesData[]> {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase is not initialized');
  }

  const functions = getFunctionsInstance();
  if (!functions) {
    throw new Error('Firebase Functions not available');
  }

  const { httpsCallable } = await import('firebase/functions');

  const fn = httpsCallable<
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
  >(functions, 'getAllGuestPreferences');

  const result = await fn({ sessionId });

  return result.data.guests;
}
