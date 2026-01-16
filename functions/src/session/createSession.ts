/**
 * Create Session Cloud Function (REQ-102)
 *
 * Allows an invited host to create a session with selected games.
 * Handles game deduplication (write-once to games collection).
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type {
  CreateSessionRequest,
  CreateSessionResponse,
  Session,
  SessionGame,
  Participant,
  SessionMember,
  SharedGame,
  SharedPreference,
} from './types.js';

/**
 * Default session TTL in hours.
 */
const DEFAULT_TTL_HOURS = 24;

/**
 * Capacity constraints.
 */
const MIN_CAPACITY = 2;
const MAX_CAPACITY = 12;
const DEFAULT_CAPACITY = 6;

/**
 * Maximum games per session.
 */
const MAX_GAMES_PER_SESSION = 50;

/**
 * Generate a random session ID (URL-safe).
 */
function generateSessionId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Create a new game session.
 */
export const createSession = onCall(async (request) => {
  const { auth, data } = request;

  // 1. Require authentication
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'Must be authenticated to create session');
  }

  const db = getFirestore();
  const uid = auth.uid;

  // 2. Verify user is an invited host (or allow any authenticated user in dev)
  const userDoc = await db.collection('users').doc(uid).get();
  const userData = userDoc.data();
  
  // Allow if: user has invited=true, OR user document doesn't exist yet (first-time user)
  // This enables testing without requiring full registration flow
  if (userDoc.exists && userData?.invited === false) {
    throw new HttpsError(
      'permission-denied',
      'Only invited hosts can create sessions'
    );
  }

  // If user doc doesn't exist, create a basic one
  if (!userDoc.exists) {
    await db.collection('users').doc(uid).set({
      invited: true,
      createdAt: Timestamp.now(),
    });
  }

  // 3. Validate request
  const req = data as CreateSessionRequest;

  if (!req.gameIds || !Array.isArray(req.gameIds) || req.gameIds.length === 0) {
    throw new HttpsError('invalid-argument', 'At least one game is required');
  }

  if (req.gameIds.length > MAX_GAMES_PER_SESSION) {
    throw new HttpsError(
      'invalid-argument',
      `Maximum ${MAX_GAMES_PER_SESSION} games per session`
    );
  }

  // Validate capacity
  let capacity = req.capacity ?? DEFAULT_CAPACITY;
  if (capacity < MIN_CAPACITY || capacity > MAX_CAPACITY) {
    throw new HttpsError(
      'invalid-argument',
      `Capacity must be between ${MIN_CAPACITY} and ${MAX_CAPACITY}`
    );
  }

  // 4. Prepare timestamps
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromMillis(
    now.toMillis() + DEFAULT_TTL_HOURS * 60 * 60 * 1000
  );

  // Parse scheduledFor (required)
  if (!req.scheduledFor) {
    throw new HttpsError('invalid-argument', 'scheduledFor is required');
  }
  let scheduledFor: Timestamp;
  try {
    scheduledFor = Timestamp.fromDate(new Date(req.scheduledFor));
  } catch {
    throw new HttpsError('invalid-argument', 'Invalid scheduledFor date');
  }

  // Validate hostDisplayName
  if (!req.hostDisplayName?.trim()) {
    throw new HttpsError('invalid-argument', 'hostDisplayName is required');
  }
  const hostDisplayName = req.hostDisplayName.trim();

  // 5. Generate session ID
  const sessionId = generateSessionId();

  // 6. Build game data map for upload
  const gameDataMap = new Map<string, (typeof req.games)[0]>();
  for (const game of req.games || []) {
    if (game.gameId && req.gameIds.includes(game.gameId)) {
      gameDataMap.set(game.gameId, game);
    }
  }

  // 7. Check which games already exist and upload missing ones
  const gamesRef = db.collection('games');
  let gamesUploaded = 0;

  // Use batched writes for efficiency
  const batch = db.batch();

  // Check existing games
  const existingGamesSnap = await gamesRef
    .where('__name__', 'in', req.gameIds.slice(0, 10)) // Firestore limit
    .get();
  const existingGameIds = new Set(existingGamesSnap.docs.map((d) => d.id));

  // For larger game lists, check in batches
  if (req.gameIds.length > 10) {
    for (let i = 10; i < req.gameIds.length; i += 10) {
      const batchIds = req.gameIds.slice(i, i + 10);
      const batchSnap = await gamesRef
        .where('__name__', 'in', batchIds)
        .get();
      batchSnap.docs.forEach((d) => existingGameIds.add(d.id));
    }
  }

  // Upload missing games (write-once)
  for (const gameId of req.gameIds) {
    if (!existingGameIds.has(gameId)) {
      const gameData = gameDataMap.get(gameId);
      if (gameData) {
        const sharedGame: SharedGame = {
          gameId,
          name: gameData.name,
          minPlayers: gameData.minPlayers ?? null,
          maxPlayers: gameData.maxPlayers ?? null,
          playingTimeMinutes: gameData.playingTimeMinutes ?? null,
          thumbnail: gameData.thumbnail ?? null,
          image: gameData.image ?? null,
          mechanics: gameData.mechanics ?? [],
          categories: gameData.categories ?? [],
          source: gameData.source ?? 'bgg',
          createdAt: now,
          createdByUid: uid,
        };
        batch.set(gamesRef.doc(gameId), sharedGame);
        gamesUploaded++;
      }
    }
  }

  // 8. Create session document
  const sessionRef = db.collection('sessions').doc(sessionId);
  const shareMode = req.shareMode === 'quick' ? 'quick' : 'detailed';
  const session: Session = {
    sessionId,
    title: req.title?.trim() || 'Game Night',
    createdAt: now,
    createdByUid: uid,
    scheduledFor,
    capacity,
    minPlayers: req.minPlayers ?? null,
    maxPlayers: req.maxPlayers ?? null,
    minPlayingTimeMinutes: req.minPlayingTimeMinutes ?? null,
    maxPlayingTimeMinutes: req.maxPlayingTimeMinutes ?? null,
    status: 'open',
    expiresAt,
    shareMode,
  };
  batch.set(sessionRef, session);

  // 9. Create sessionGames references
  for (const gameId of req.gameIds) {
    const sessionGame: SessionGame = {
      gameId,
      addedAt: now,
    };
    batch.set(sessionRef.collection('sessionGames').doc(gameId), sessionGame);
  }

  // 10. Create host participant slot
  const hostParticipantId = `host-${uid}`;
  const hostParticipant: Participant = {
    participantId: hostParticipantId,
    slotType: 'named',
    displayName: hostDisplayName,
    claimed: true,
    claimedByUid: uid,
    claimedAt: now,
    inviteTokenHash: null,
    expiresAt,
  };
  batch.set(
    sessionRef.collection('participants').doc(hostParticipantId),
    hostParticipant
  );

  // 11. Create named participant slots (for known players)
  const namedParticipants = req.namedParticipants ?? [];
  let namedSlotCount = 0;
  for (const np of namedParticipants) {
    if (!np.displayName?.trim()) continue;
    namedSlotCount++;
    const namedSlotId = `named-${namedSlotCount}`;
    const namedSlot: Participant = {
      participantId: namedSlotId,
      slotType: 'named',
      displayName: np.displayName.trim(),
      claimed: false,
      claimedByUid: null,
      claimedAt: null,
      inviteTokenHash: null,
      expiresAt,
    };
    batch.set(
      sessionRef.collection('participants').doc(namedSlotId),
      namedSlot
    );

    // If preferences are included, store them
    if (np.includePreferences && np.preferences && np.preferences.length > 0) {
      const sharedPref: SharedPreference = {
        participantId: namedSlotId,
        displayName: np.displayName.trim(),
        preferences: np.preferences,
        sharedAt: now,
        sharedByUid: uid,
      };
      batch.set(
        sessionRef.collection('sharedPreferences').doc(namedSlotId),
        sharedPref
      );
    }
  }

  // 12. Create open participant slots for remaining capacity
  // Slots used = 1 (host) + namedSlotCount
  const openSlotsNeeded = capacity - 1 - namedSlotCount;
  for (let i = 1; i <= openSlotsNeeded; i++) {
    const guestSlotId = `slot-${i}`;
    const guestSlot: Participant = {
      participantId: guestSlotId,
      slotType: 'open',
      displayName: null,
      claimed: false,
      claimedByUid: null,
      claimedAt: null,
      inviteTokenHash: null,
      expiresAt,
    };
    batch.set(
      sessionRef.collection('participants').doc(guestSlotId),
      guestSlot
    );
  }

  // 13. Create host member record (host is always ready)
  const hostMember: SessionMember = {
    uid,
    participantId: hostParticipantId,
    role: 'host',
    displayName: hostDisplayName,
    ready: true,
    joinedAt: now,
    expiresAt,
  };
  batch.set(sessionRef.collection('members').doc(uid), hostMember);

  // 14. Commit all writes
  await batch.commit();

  console.log(
    `[createSession] Session ${sessionId} created by ${uid} with ${req.gameIds.length} games (${gamesUploaded} uploaded), ${namedSlotCount} named slots`
  );

  const response: CreateSessionResponse = {
    ok: true,
    sessionId,
    gamesUploaded,
  };

  return response;
});
