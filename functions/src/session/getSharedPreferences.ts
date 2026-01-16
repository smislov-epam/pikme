/**
 * Get Shared Preferences Cloud Function (REQ-103)
 *
 * Returns shared preferences for a participant who claimed a named slot.
 * Only accessible by the member who claimed the slot.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import type {
  GetSharedPreferencesRequest,
  GetSharedPreferencesResponse,
  Session,
  SharedPreference,
} from './types.js';

/**
 * Get shared preferences for a claimed slot.
 */
export const getSharedPreferences = onCall(async (request) => {
  const { auth, data } = request;

  // 1. Require authentication
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const db = getFirestore();
  const uid = auth.uid;
  const req = data as GetSharedPreferencesRequest;

  // 2. Validate request
  if (!req.sessionId?.trim()) {
    throw new HttpsError('invalid-argument', 'sessionId is required');
  }

  const sessionId = req.sessionId.trim();

  // 3. Check session exists and is valid
  const sessionRef = db.collection('sessions').doc(sessionId);
  const sessionDoc = await sessionRef.get();

  if (!sessionDoc.exists) {
    throw new HttpsError('not-found', 'Session not found');
  }

  const session = sessionDoc.data() as Session;
  const now = Date.now();
  if (session.expiresAt.toMillis() < now) {
    throw new HttpsError('failed-precondition', 'Session has expired');
  }

  // 4. Check caller is a member
  const memberDoc = await sessionRef.collection('members').doc(uid).get();
  if (!memberDoc.exists) {
    throw new HttpsError('permission-denied', 'Not a member of this session');
  }

  const memberData = memberDoc.data();
  const participantId = memberData?.participantId;

  if (!participantId) {
    throw new HttpsError('internal', 'Invalid member data');
  }

  // 5. Check if there are shared preferences for this slot
  const prefsDoc = await sessionRef
    .collection('sharedPreferences')
    .doc(participantId)
    .get();

  if (!prefsDoc.exists) {
    // No shared preferences - return empty
    const response: GetSharedPreferencesResponse = {
      ok: true,
      hasPreferences: false,
      preferences: [],
      displayName: null,
    };
    return response;
  }

  const sharedPrefs = prefsDoc.data() as SharedPreference;

  console.log(
    `[getSharedPreferences] User ${uid} retrieved ${sharedPrefs.preferences.length} preferences for slot ${participantId}`
  );

  const response: GetSharedPreferencesResponse = {
    ok: true,
    hasPreferences: true,
    preferences: sharedPrefs.preferences,
    displayName: sharedPrefs.displayName,
  };

  return response;
});
