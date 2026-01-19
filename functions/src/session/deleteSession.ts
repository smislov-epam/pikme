/**
 * Delete Session Cloud Function (REQ-108)
 *
 * Permanently deletes a session and its subcollections.
 * Host-only operation.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import type { Session } from './types.js';

export interface DeleteSessionRequest {
  sessionId: string;
}

export interface DeleteSessionResponse {
  ok: true;
  sessionId: string;
}

async function deleteCollectionDocs(params: {
  sessionId: string;
  collectionName: string;
}): Promise<number> {
  const db = getFirestore();
  const sessionRef = db.collection('sessions').doc(params.sessionId);
  const colRef = sessionRef.collection(params.collectionName);

  const docs = await colRef.listDocuments();
  let deleted = 0;

  // Firestore batch limit is 500; keep a safe buffer.
  const chunkSize = 450;
  for (let i = 0; i < docs.length; i += chunkSize) {
    const chunk = docs.slice(i, i + chunkSize);
    const batch = db.batch();
    for (const docRef of chunk) {
      batch.delete(docRef);
    }
    await batch.commit();
    deleted += chunk.length;
  }

  return deleted;
}

/**
 * Delete a session permanently.
 * Only the host (creator) can delete a session.
 */
export const deleteSession = onCall(async (request) => {
  const { auth, data } = request;
  const req = data as DeleteSessionRequest;

  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'Must be signed in to delete a session');
  }

  if (!req.sessionId?.trim()) {
    throw new HttpsError('invalid-argument', 'sessionId is required');
  }

  const sessionId = req.sessionId.trim();
  const db = getFirestore();
  const sessionRef = db.collection('sessions').doc(sessionId);
  const sessionDoc = await sessionRef.get();

  if (!sessionDoc.exists) {
    throw new HttpsError('not-found', 'Session not found');
  }

  const session = sessionDoc.data() as Session;

  if (session.createdByUid !== auth.uid) {
    throw new HttpsError('permission-denied', 'Only the host can delete this session');
  }

  // Delete known subcollections first.
  await deleteCollectionDocs({ sessionId, collectionName: 'guestPreferences' });
  await deleteCollectionDocs({ sessionId, collectionName: 'sharedPreferences' });
  await deleteCollectionDocs({ sessionId, collectionName: 'members' });
  await deleteCollectionDocs({ sessionId, collectionName: 'participants' });
  await deleteCollectionDocs({ sessionId, collectionName: 'sessionGames' });

  // Delete the session document last.
  await sessionRef.delete();

  console.log(`[deleteSession] Session ${sessionId} deleted by ${auth.uid}`);

  const response: DeleteSessionResponse = {
    ok: true,
    sessionId,
  };

  return response;
});
