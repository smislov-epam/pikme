/**
 * Submit Guest Preferences Cloud Function (REQ-103)
 *
 * Allows a guest (or host) to save their preferences to Firebase.
 * The host can then see these preferences in their wizard.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type {
  SubmitGuestPreferencesRequest,
  SubmitGuestPreferencesResponse,
  Session,
  SharedGamePreference,
  SharedPreference,
} from './types.js';

/**
 * Submit guest (or host) preferences.
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
  const isHost = session.createdByUid === uid;

  // Check if host is submitting for a local user
  const forLocalUser = req.forLocalUser;
  if (forLocalUser && !isHost) {
    throw new HttpsError('permission-denied', 'Only host can submit preferences for local users');
  }

  // 5. Validate and normalize preferences
  const validPreferences: SharedGamePreference[] = req.preferences
    .filter((p) => typeof p.bggId === 'number' && p.bggId > 0)
    .map((p) => ({
      bggId: p.bggId,
      rank: typeof p.rank === 'number' ? p.rank : null,
      isTopPick: Boolean(p.isTopPick),
      isDisliked: Boolean(p.isDisliked),
    }));

  // 6. Save preferences to Firestore
  const batch = db.batch();
  
  // Determine the effective participant info
  const effectiveParticipantId = forLocalUser?.participantId || participantId;
  const effectiveDisplayName = forLocalUser?.displayName || displayName;

  // Save to guestPreferences (for tracking and host view)
  // For local users, use a composite key: uid_localParticipantId
  const guestPrefsDocId = forLocalUser ? `${uid}_${forLocalUser.participantId}` : uid;
  const guestPrefsRef = sessionRef.collection('guestPreferences').doc(guestPrefsDocId);
  batch.set(guestPrefsRef, {
    uid,
    participantId: effectiveParticipantId,
    displayName: effectiveDisplayName,
    preferences: validPreferences,
    updatedAt: Timestamp.now(),
    isLocalUser: !!forLocalUser,
  });

  // Update sharedPreferences (so other participants see updates)
  // - For host's own preferences: use their participantId
  // - For local users: use the local user's participantId
  if (effectiveParticipantId) {
    const sharedPrefsRef = sessionRef.collection('sharedPreferences').doc(effectiveParticipantId);
    const sharedPref: SharedPreference = {
      participantId: effectiveParticipantId,
      displayName: effectiveDisplayName,
      preferences: validPreferences,
      sharedAt: Timestamp.now(),
      sharedByUid: uid,
    };
    batch.set(sharedPrefsRef, sharedPref);
  }

  await batch.commit();

  const logSuffix = forLocalUser ? ` for local user ${forLocalUser.displayName}` : '';
  console.log(
    `[submitGuestPreferences] User ${uid} (${displayName}${isHost ? ', host' : ''}) submitted ${validPreferences.length} preferences${logSuffix} for session ${sessionId}`
  );

  const response: SubmitGuestPreferencesResponse = {
    ok: true,
    preferencesCount: validPreferences.length,
  };

  return response;
});
