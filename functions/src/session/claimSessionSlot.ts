/**
 * Claim Session Slot Cloud Function (REQ-103)
 *
 * Allows a guest to claim an open slot in a session.
 * Uses anonymous authentication for guests.
 * Supports claiming specific named slots for identity claiming.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type { DocumentReference } from 'firebase-admin/firestore';
import type {
  ClaimSessionSlotRequest,
  ClaimSessionSlotResponse,
  Session,
  Participant,
  SessionMember,
} from './types.js';
import { selectOpenUnclaimedSlotDoc } from './selectOpenUnclaimedSlot.js';

function normalizeDisplayName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Claim a session slot.
 */
export const claimSessionSlot = onCall(async (request) => {
  const { auth, data } = request;

  // 1. Require authentication (can be anonymous)
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'Must be authenticated to join session');
  }

  const db = getFirestore();
  const uid = auth.uid;
  const req = data as ClaimSessionSlotRequest;

  // 2. Validate request
  if (!req.sessionId?.trim()) {
    throw new HttpsError('invalid-argument', 'sessionId is required');
  }
  if (!req.displayName?.trim()) {
    throw new HttpsError('invalid-argument', 'displayName is required');
  }

  const sessionId = req.sessionId.trim();
  const displayName = req.displayName.trim();
  const targetParticipantId = req.participantId?.trim();

  const normalizedDisplayName = normalizeDisplayName(displayName);

  if (displayName.length < 2 || displayName.length > 30) {
    throw new HttpsError(
      'invalid-argument',
      'displayName must be 2-30 characters'
    );
  }

  // 3. Use transaction for atomic claim
  const result = await db.runTransaction(async (transaction) => {
    const sessionRef = db.collection('sessions').doc(sessionId);
    const sessionDoc = await transaction.get(sessionRef);

    if (!sessionDoc.exists) {
      throw new HttpsError('not-found', 'Session not found');
    }

    const session = sessionDoc.data() as Session;

    // 4. Check session status
    if (session.status !== 'open') {
      throw new HttpsError('failed-precondition', 'Session is not open');
    }

    const now = Date.now();
    if (session.expiresAt.toMillis() < now) {
      throw new HttpsError('failed-precondition', 'Session has expired');
    }

    // 5. Check if user is already a member
    const memberRef = sessionRef.collection('members').doc(uid);
    const memberDoc = await transaction.get(memberRef);

    if (memberDoc.exists) {
      throw new HttpsError('already-exists', 'Already a member of this session');
    }

    // 6. Find the slot to claim
    const participantsRef = sessionRef.collection('participants');
    let slotDoc: { id: string; ref: DocumentReference; data: () => Participant };

    if (targetParticipantId) {
      // Claim specific named slot
      const specificSlotRef = participantsRef.doc(targetParticipantId);
      const specificDoc = await transaction.get(specificSlotRef);

      if (!specificDoc.exists) {
        throw new HttpsError('not-found', 'Participant slot not found');
      }

      const participant = specificDoc.data() as Participant;
      if (participant.claimed) {
        throw new HttpsError('already-exists', 'Slot has already been claimed');
      }

      slotDoc = {
        id: specificDoc.id,
        ref: specificDoc.ref,
        data: () => participant,
      };
    } else {
      // If the guest typed a name that matches a reserved named slot, claim it.
      // Otherwise, fall back to an OPEN slot.
      //
      // We query unclaimed participants and then pick either:
      // 1) a unique named slot with matching displayName, or
      // 2) an OPEN slot.
      //
      // This avoids requiring a composite index on (claimed, slotType).
      const unclaimedSnap = await transaction.get(
        participantsRef.where('claimed', '==', false).limit(50)
      );

      if (unclaimedSnap.empty) {
        throw new HttpsError('resource-exhausted', 'Session is full');
      }

      const unclaimedDocs = unclaimedSnap.docs.map((doc) => ({
        id: doc.id,
        ref: doc.ref,
        data: () => doc.data() as Participant,
      }));

      const matchingNamed = unclaimedDocs.filter((d) => {
        const p = d.data();
        if (p.slotType !== 'named') return false;
        if (!p.displayName) return false;
        return normalizeDisplayName(p.displayName) === normalizedDisplayName;
      });

      if (matchingNamed.length === 1) {
        slotDoc = matchingNamed[0];
      } else if (matchingNamed.length > 1) {
        throw new HttpsError(
          'failed-precondition',
          'Multiple reserved slots match that name. Please select your reserved name explicitly.'
        );
      } else {
        const picked = selectOpenUnclaimedSlotDoc(unclaimedDocs);
        if (!picked) {
          throw new HttpsError(
            'failed-precondition',
            'No open slots are available. Please select your reserved name, or ask the host to add more spots.'
          );
        }
        slotDoc = picked;
      }
    }

    const participantId = slotDoc.id;
    const nowTimestamp = Timestamp.now();

    // 7. Check if slot has shared preferences
    const sharedPrefsRef = sessionRef
      .collection('sharedPreferences')
      .doc(participantId);
    const sharedPrefsDoc = await transaction.get(sharedPrefsRef);
    const hasSharedPreferences = sharedPrefsDoc.exists;

    // 8. Claim the slot
    const updatedParticipant: Partial<Participant> = {
      displayName,
      claimed: true,
      claimedByUid: uid,
      claimedAt: nowTimestamp,
    };
    transaction.update(slotDoc.ref, updatedParticipant);

    // 9. Create member record (guest starts as not ready)
    const member: SessionMember = {
      uid,
      participantId,
      role: 'guest',
      displayName,
      ready: false,
      joinedAt: nowTimestamp,
      expiresAt: session.expiresAt,
    };
    transaction.set(memberRef, member);

    return { participantId, hasSharedPreferences };
  });

  console.log(
    `[claimSessionSlot] User ${uid} claimed slot ${result.participantId} in session ${sessionId}`
  );

  const response: ClaimSessionSlotResponse = {
    ok: true,
    participantId: result.participantId,
    sessionId,
    hasSharedPreferences: result.hasSharedPreferences,
  };

  return response;
});
