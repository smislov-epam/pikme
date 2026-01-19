/**
 * Close Session Cloud Function (REQ-106/REQ-108)
 *
 * Sets session status to 'closed' when host reveals results.
 * This triggers notifications to guests polling for results.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import type { Session, SessionResult } from './types.js';

/**
 * Tonight's Pick result to store when closing session.
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
 * Request payload for closeSession function.
 */
export interface CloseSessionRequest {
  sessionId: string;
  /** Tonight's Pick result (optional - for showing to guests) */
  result?: CloseSessionResult;
}

/**
 * Response from closeSession function.
 */
export interface CloseSessionResponse {
  ok: true;
  sessionId: string;
  status: 'closed';
  closedAt: string;
}

/**
 * Close a session (set status to 'closed').
 * Only the host (creator) can close a session.
 */
export const closeSession = onCall(async (request) => {
  const { data, auth } = request;
  const req = data as CloseSessionRequest;

  // 1. Require authentication
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'Must be signed in to close a session');
  }

  const callerUid = auth.uid;

  // 2. Validate request
  if (!req.sessionId?.trim()) {
    throw new HttpsError('invalid-argument', 'sessionId is required');
  }

  const db = getFirestore();
  const sessionId = req.sessionId.trim();

  // 3. Fetch session document
  const sessionRef = db.collection('sessions').doc(sessionId);
  const sessionDoc = await sessionRef.get();

  if (!sessionDoc.exists) {
    throw new HttpsError('not-found', 'Session not found');
  }

  const session = sessionDoc.data() as Session;

  // 4. Verify caller is the host
  if (session.createdByUid !== callerUid) {
    throw new HttpsError('permission-denied', 'Only the host can close this session');
  }

  // 5. Check if already closed
  if (session.status === 'closed') {
    // Idempotent - return success if already closed
    return {
      ok: true,
      sessionId,
      status: 'closed',
      closedAt: new Date().toISOString(),
    } satisfies CloseSessionResponse;
  }

  // 6. Check if session is expired
  const now = Date.now();
  if (session.expiresAt.toMillis() < now) {
    throw new HttpsError('failed-precondition', 'Cannot close an expired session');
  }

  // 7. Build update payload
  const updatePayload: Record<string, unknown> = {
    status: 'closed',
    closedAt: FieldValue.serverTimestamp(),
  };

  // 8. Include result if provided
  if (req.result) {
    const result: SessionResult = {
      gameId: String(req.result.gameId),
      name: String(req.result.name || 'Unknown Game'),
      thumbnail: req.result.thumbnail ?? null,
      image: req.result.image ?? null,
      score: typeof req.result.score === 'number' ? req.result.score : 0,
      minPlayers: typeof req.result.minPlayers === 'number' ? req.result.minPlayers : null,
      maxPlayers: typeof req.result.maxPlayers === 'number' ? req.result.maxPlayers : null,
      playingTimeMinutes: typeof req.result.playingTimeMinutes === 'number' ? req.result.playingTimeMinutes : null,
    };
    updatePayload.result = result;
  }

  // 9. Update session status to 'closed'
  await sessionRef.update(updatePayload);

  const response: CloseSessionResponse = {
    ok: true,
    sessionId,
    status: 'closed',
    closedAt: new Date().toISOString(),
  };

  return response;
});
