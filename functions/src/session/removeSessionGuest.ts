/**
 * Remove Session Guest Cloud Function (Quick Share)
 *
 * Allows host to remove a guest from the session (delete member + preferences)
 * and free their participant slot.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import type {
  RemoveSessionGuestRequest,
  RemoveSessionGuestResponse,
  Participant,
  Session,
} from './types.js';

export const removeSessionGuest = onCall(async (request) => {
  const { auth, data } = request;

  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const req = data as RemoveSessionGuestRequest;
  if (!req.sessionId?.trim()) {
    throw new HttpsError('invalid-argument', 'sessionId is required');
  }
  if (!req.guestUid?.trim()) {
    throw new HttpsError('invalid-argument', 'guestUid is required');
  }

  const db = getFirestore();
  const sessionId = req.sessionId.trim();
  const guestUid = req.guestUid.trim();

  const sessionRef = db.collection('sessions').doc(sessionId);
  const sessionDoc = await sessionRef.get();
  if (!sessionDoc.exists) {
    throw new HttpsError('not-found', 'Session not found');
  }

  const session = sessionDoc.data() as Session;
  const hostUid = auth.uid;

  // Require host (createdByUid) to remove guests
  if (session.createdByUid !== hostUid) {
    throw new HttpsError('permission-denied', 'Only the host can remove guests');
  }

  const memberRef = sessionRef.collection('members').doc(guestUid);
  const memberDoc = await memberRef.get();
  if (!memberDoc.exists) {
    throw new HttpsError('not-found', 'Guest is not a member of this session');
  }

  const member = memberDoc.data();
  if (member?.role !== 'guest') {
    throw new HttpsError('failed-precondition', 'Only guest members can be removed');
  }

  const participantId = member?.participantId;
  if (!participantId) {
    throw new HttpsError('failed-precondition', 'Guest participantId missing');
  }

  await db.runTransaction(async (transaction) => {
    const participantRef = sessionRef.collection('participants').doc(participantId);
    const participantDoc = await transaction.get(participantRef);

    if (participantDoc.exists) {
      const participant = participantDoc.data() as Participant;
      const updates: Partial<Participant> = {
        claimed: false,
        claimedByUid: null,
        claimedAt: null,
      };

      if (participant.slotType === 'open') {
        updates.displayName = null;
      }

      transaction.update(participantRef, updates);
    }

    transaction.delete(memberRef);
    transaction.delete(sessionRef.collection('guestPreferences').doc(guestUid));

  });

  const response: RemoveSessionGuestResponse = { ok: true };
  return response;
});