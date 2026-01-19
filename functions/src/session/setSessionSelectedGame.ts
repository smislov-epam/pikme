/**
 * Set Session Selected Game Cloud Function (REQ-106/REQ-108)
 *
 * Stores the host's selected game on an OPEN session without closing it.
 * This enables guests to be notified immediately via realtime listeners.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import type { Session, SessionResult } from './types.js';

export interface SetSessionSelectedGameRequest {
  sessionId: string;
  selectedGame: {
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

export interface SetSessionSelectedGameResponse {
  ok: true;
  sessionId: string;
  status: 'open';
  selectedAt: string;
}

/**
 * Set a selected game on an open session.
 * Only the host (creator) can set it.
 */
export const setSessionSelectedGame = onCall(async (request) => {
  const { data, auth } = request;
  const req = data as SetSessionSelectedGameRequest;

  if (!auth?.uid) {
    throw new HttpsError(
      'unauthenticated',
      'Must be signed in to set the selected game'
    );
  }

  if (!req.sessionId?.trim()) {
    throw new HttpsError('invalid-argument', 'sessionId is required');
  }

  if (!req.selectedGame?.gameId || !req.selectedGame?.name) {
    throw new HttpsError('invalid-argument', 'selectedGame is required');
  }

  const callerUid = auth.uid;
  const db = getFirestore();
  const sessionId = req.sessionId.trim();

  const sessionRef = db.collection('sessions').doc(sessionId);
  const sessionDoc = await sessionRef.get();

  if (!sessionDoc.exists) {
    throw new HttpsError('not-found', 'Session not found');
  }

  const session = sessionDoc.data() as Session;

  if (session.createdByUid !== callerUid) {
    throw new HttpsError(
      'permission-denied',
      'Only the host can set the selected game'
    );
  }

  const now = Date.now();
  if (session.expiresAt.toMillis() < now) {
    throw new HttpsError('failed-precondition', 'Session has expired');
  }

  if (session.status !== 'open') {
    throw new HttpsError(
      'failed-precondition',
      'Cannot set selected game on a non-open session'
    );
  }

  const selectedGame: SessionResult = {
    gameId: String(req.selectedGame.gameId),
    name: String(req.selectedGame.name || 'Unknown Game'),
    thumbnail: req.selectedGame.thumbnail ?? null,
    image: req.selectedGame.image ?? null,
    score: typeof req.selectedGame.score === 'number' ? req.selectedGame.score : 0,
    minPlayers:
      typeof req.selectedGame.minPlayers === 'number'
        ? req.selectedGame.minPlayers
        : null,
    maxPlayers:
      typeof req.selectedGame.maxPlayers === 'number'
        ? req.selectedGame.maxPlayers
        : null,
    playingTimeMinutes:
      typeof req.selectedGame.playingTimeMinutes === 'number'
        ? req.selectedGame.playingTimeMinutes
        : null,
  };

  await sessionRef.update({
    selectedGame,
    selectedAt: FieldValue.serverTimestamp(),
  });

  return {
    ok: true,
    sessionId,
    status: 'open',
    selectedAt: new Date().toISOString(),
  } satisfies SetSessionSelectedGameResponse;
});
