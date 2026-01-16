/**
 * Get Session Games Cloud Function (REQ-103)
 *
 * Returns game data for a session (without owner info for privacy).
 * Only accessible by session members.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type {
  GetSessionGamesRequest,
  GetSessionGamesResponse,
  SessionGameData,
  Session,
  SessionGame,
  SharedGame,
} from './types';

export const getSessionGames = onCall<
  GetSessionGamesRequest,
  Promise<GetSessionGamesResponse>
>(async (request) => {
  const { auth, data } = request;

  // Require authentication
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { sessionId } = data;
  if (!sessionId || typeof sessionId !== 'string') {
    throw new HttpsError('invalid-argument', 'sessionId is required');
  }

  const db = getFirestore();
  const now = Timestamp.now();

  // Get session
  const sessionRef = db.collection('sessions').doc(sessionId);
  const sessionSnap = await sessionRef.get();

  if (!sessionSnap.exists) {
    throw new HttpsError('not-found', 'Session not found');
  }

  const session = sessionSnap.data() as Session;

  // Check if session is expired
  if (session.expiresAt.toMillis() < now.toMillis()) {
    throw new HttpsError('failed-precondition', 'Session has expired');
  }

  // Verify caller is a member
  const memberRef = sessionRef.collection('members').doc(auth.uid);
  const memberSnap = await memberRef.get();

  if (!memberSnap.exists) {
    throw new HttpsError(
      'permission-denied',
      'You must join the session first'
    );
  }

  // Get session games
  const sessionGamesSnap = await sessionRef.collection('sessionGames').get();
  const gameIds = sessionGamesSnap.docs.map(
    (doc) => (doc.data() as SessionGame).gameId
  );

  if (gameIds.length === 0) {
    return { ok: true, games: [] };
  }

  // Fetch game data from shared games collection
  const gamesCollection = db.collection('games');
  const games: SessionGameData[] = [];

  // Batch fetch in groups of 10 (Firestore limit)
  const batches: string[][] = [];
  for (let i = 0; i < gameIds.length; i += 10) {
    batches.push(gameIds.slice(i, i + 10));
  }

  for (const batch of batches) {
    const refs = batch.map((id) => gamesCollection.doc(id));
    const snaps = await db.getAll(...refs);

    for (const snap of snaps) {
      if (snap.exists) {
        const gameData = snap.data() as SharedGame;
        // Return game data WITHOUT owner info for privacy
        games.push({
          gameId: gameData.gameId,
          name: gameData.name,
          minPlayers: gameData.minPlayers,
          maxPlayers: gameData.maxPlayers,
          playingTimeMinutes: gameData.playingTimeMinutes,
          thumbnail: gameData.thumbnail,
          image: gameData.image,
          mechanics: gameData.mechanics ?? [],
          categories: gameData.categories ?? [],
          source: gameData.source ?? 'bgg',
        });
      }
    }
  }

  console.log(
    `[getSessionGames] User ${auth.uid} fetched ${games.length} games from session ${sessionId}`
  );

  return { ok: true, games };
});
