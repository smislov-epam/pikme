/**
 * Set Guest Ready Cloud Function (REQ-103)
 *
 * Allows a guest to mark themselves as ready after setting preferences.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import type {
  SetGuestReadyRequest,
  SetGuestReadyResponse,
  Session,
} from './types.js';

/**
 * Set guest as ready.
 */
export const setGuestReady = onCall(async (request) => {
  const { auth, data } = request;

  // 1. Require authentication
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const db = getFirestore();
  const uid = auth.uid;
  const req = data as SetGuestReadyRequest;

  // 2. Validate request
  if (!req.sessionId?.trim()) {
    throw new HttpsError('invalid-argument', 'sessionId is required');
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

  // 4. Verify user is a member
  const memberRef = sessionRef.collection('members').doc(uid);
  const memberDoc = await memberRef.get();

  if (!memberDoc.exists) {
    throw new HttpsError('permission-denied', 'Not a member of this session');
  }

  // 5. Update ready status
  await memberRef.update({ ready: true });

  console.log(`[setGuestReady] User ${uid} marked ready in session ${sessionId}`);

  const response: SetGuestReadyResponse = {
    ok: true,
  };

  return response;
});
