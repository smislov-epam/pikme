/**
 * Submit Guest Preferences Cloud Function (REQ-103)
 *
 * Allows a guest to save their preferences to Firebase.
 * The host can then see these preferences in their wizard.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type {
  SubmitGuestPreferencesRequest,
  SubmitGuestPreferencesResponse,
  Session,
  SharedGamePreference,
} from './types.js';

/**
 * Submit guest preferences.
 */
export const submitGuestPreferences = onCall(async (request) => {
  const { auth, data } = request;

  // 1. Require authentication
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const db = getFirestore();
  const uid = auth.uid;
  const req = data as SubmitGuestPreferencesRequest;

  // 2. Validate request
  if (!req.sessionId?.trim()) {
    throw new HttpsError('invalid-argument', 'sessionId is required');
  }

  if (!Array.isArray(req.preferences)) {
    throw new HttpsError('invalid-argument', 'preferences must be an array');
  }

  const sessionId = req.sessionId.trim();

  // 3. Verify session exists and is open
  const sessionRef = db.collection('sessions').doc(sessionId);
  const sessionDoc = await sessionRef.get();

  if (!sessionDoc.exists) {
    throw new HttpsError('not-found', 'Session not found');
  }

  const session = sessionDoc.data() as Session;

  if (session.status !== 'open') {
    throw new HttpsError('failed-precondition', 'Session is not open');
  }

  const now = Date.now();
  if (session.expiresAt.toMillis() < now) {
    throw new HttpsError('failed-precondition', 'Session has expired');
  }

  // 4. Verify user is a member and get their info
  const memberRef = sessionRef.collection('members').doc(uid);
  const memberDoc = await memberRef.get();

  if (!memberDoc.exists) {
    throw new HttpsError('permission-denied', 'Not a member of this session');
  }

  const member = memberDoc.data();
  const participantId = member?.participantId;
  const displayName = member?.displayName || 'Guest';

  // 5. Validate and normalize preferences
  const validPreferences: SharedGamePreference[] = req.preferences
    .filter((p) => typeof p.bggId === 'number' && p.bggId > 0)
    .map((p) => ({
      bggId: p.bggId,
      rank: typeof p.rank === 'number' ? p.rank : null,
      isTopPick: Boolean(p.isTopPick),
      isDisliked: Boolean(p.isDisliked),
    }));

  // 6. Save guest preferences to Firestore
  const guestPrefsRef = sessionRef.collection('guestPreferences').doc(uid);
  await guestPrefsRef.set({
    uid,
    participantId,
    displayName,
    preferences: validPreferences,
    updatedAt: Timestamp.now(),
  });

  console.log(
    `[submitGuestPreferences] User ${uid} (${displayName}) submitted ${validPreferences.length} preferences for session ${sessionId}`
  );

  const response: SubmitGuestPreferencesResponse = {
    ok: true,
    preferencesCount: validPreferences.length,
  };

  return response;
});
