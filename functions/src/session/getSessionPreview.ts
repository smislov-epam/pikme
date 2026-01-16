/**
 * Get Session Preview Cloud Function (REQ-103)
 *
 * Returns session summary for join page without requiring authentication.
 * Guests can view basic info before deciding to join.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import type {
  GetSessionPreviewRequest,
  GetSessionPreviewResponse,
  Session,
  Participant,
  NamedSlotInfo,
} from './types.js';

/**
 * Get session preview for join page.
 */
export const getSessionPreview = onCall(async (request) => {
  const { data } = request;
  const req = data as GetSessionPreviewRequest;

  // 1. Validate request
  if (!req.sessionId?.trim()) {
    throw new HttpsError('invalid-argument', 'sessionId is required');
  }

  const db = getFirestore();
  const sessionId = req.sessionId.trim();

  // 2. Fetch session document
  const sessionRef = db.collection('sessions').doc(sessionId);
  const sessionDoc = await sessionRef.get();

  if (!sessionDoc.exists) {
    throw new HttpsError('not-found', 'Session not found');
  }

  const session = sessionDoc.data() as Session;

  // 3. Check if session is expired
  const now = Date.now();
  if (session.expiresAt.toMillis() < now) {
    throw new HttpsError('failed-precondition', 'Session has expired');
  }

  // 4. Count claimed slots
  const membersSnap = await sessionRef.collection('members').get();
  const claimedCount = membersSnap.size;
  const availableSlots = Math.max(0, session.capacity - claimedCount);

  // 5. Count games
  const gamesSnap = await sessionRef.collection('sessionGames').get();
  const gameCount = gamesSnap.size;

  // 6. Get unclaimed named slots
  const participantsSnap = await sessionRef.collection('participants').get();
  const sharedPrefsSnap = await sessionRef.collection('sharedPreferences').get();
  const sharedPrefsIds = new Set(sharedPrefsSnap.docs.map((d) => d.id));

  const namedSlots: NamedSlotInfo[] = [];
  for (const doc of participantsSnap.docs) {
    const participant = doc.data() as Participant;
    // Include only unclaimed named slots
    if (participant.slotType === 'named' && !participant.claimed) {
      namedSlots.push({
        participantId: participant.participantId,
        displayName: participant.displayName ?? '',
        hasSharedPreferences: sharedPrefsIds.has(participant.participantId),
      });
    }
  }

  // 7. Build response
  const response: GetSessionPreviewResponse = {
    ok: true,
    sessionId,
    title: session.title,
    scheduledFor: session.scheduledFor.toDate().toISOString(),
    minPlayers: session.minPlayers,
    maxPlayers: session.maxPlayers,
    minPlayingTimeMinutes: session.minPlayingTimeMinutes,
    maxPlayingTimeMinutes: session.maxPlayingTimeMinutes,
    gameCount,
    status: session.status,
    capacity: session.capacity,
    claimedCount,
    availableSlots,
    namedSlots,
    shareMode: session.shareMode ?? 'detailed',
  };

  return response;
});
