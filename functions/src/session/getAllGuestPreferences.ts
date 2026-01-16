/**
 * Get All Guest Preferences Cloud Function (REQ-103)
 *
 * Allows the host to get all guest preferences for a session.
 * Returns preferences from all guests who have joined and set their preferences.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import type {
  GetAllGuestPreferencesRequest,
  GetAllGuestPreferencesResponse,
  Session,
  GuestPreferencesData,
} from './types.js';

/**
 * Get all guest preferences for a session (host only).
 */
export const getAllGuestPreferences = onCall(async (request) => {
  const { auth, data } = request;

  // 1. Require authentication
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const db = getFirestore();
  const uid = auth.uid;
  const req = data as GetAllGuestPreferencesRequest;

  // 2. Validate request
  if (!req.sessionId?.trim()) {
    throw new HttpsError('invalid-argument', 'sessionId is required');
  }

  const sessionId = req.sessionId.trim();

  // 3. Verify session exists
  const sessionRef = db.collection('sessions').doc(sessionId);
  const sessionDoc = await sessionRef.get();

  if (!sessionDoc.exists) {
    throw new HttpsError('not-found', 'Session not found');
  }

  const session = sessionDoc.data() as Session;

  // 4. Verify user is the host
  if (session.createdByUid !== uid) {
    throw new HttpsError('permission-denied', 'Only the host can view all guest preferences');
  }

  // 5. Get all guest preferences
  const guestPrefsSnapshot = await sessionRef.collection('guestPreferences').get();
  
  const guests: GuestPreferencesData[] = [];
  
  guestPrefsSnapshot.forEach((doc) => {
    const data = doc.data();
    guests.push({
      uid: data.uid,
      participantId: data.participantId,
      displayName: data.displayName,
      preferences: data.preferences || [],
      ready: false, // Will be updated from members
      updatedAt: data.updatedAt?.toDate()?.toISOString() || null,
    });
  });

  // 6. Get ready status from members
  const membersSnapshot = await sessionRef.collection('members').get();
  const readyMap = new Map<string, boolean>();
  
  membersSnapshot.forEach((doc) => {
    const data = doc.data();
    readyMap.set(doc.id, Boolean(data.ready));
  });

  // Update ready status
  guests.forEach((guest) => {
    guest.ready = readyMap.get(guest.uid) || false;
  });

  console.log(
    `[getAllGuestPreferences] Host ${uid} fetched ${guests.length} guest preferences for session ${sessionId}`
  );

  const response: GetAllGuestPreferencesResponse = {
    ok: true,
    guests,
  };

  return response;
});
