/**
 * Get Session Members Cloud Function (REQ-103)
 *
 * Returns member info for a session (host-only view).
 * Shows join status and ready state for each member.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type {
  GetSessionMembersRequest,
  GetSessionMembersResponse,
  MemberInfo,
  Session,
  SessionMember,
} from './types';

export const getSessionMembers = onCall<
  GetSessionMembersRequest,
  Promise<GetSessionMembersResponse>
>(async (request) => {
  const { auth, data } = request;

  // Require authentication
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { sessionId } = data;
  if (!sessionId || typeof sessionId !== 'string') {
    throw new HttpsError('invalid-argument', 'sessionId is required');
  }

  const db = getFirestore();
  const now = Timestamp.now();

  // Get session
  const sessionRef = db.collection('sessions').doc(sessionId);
  const sessionSnap = await sessionRef.get();

  if (!sessionSnap.exists) {
    throw new HttpsError('not-found', 'Session not found');
  }

  const session = sessionSnap.data() as Session;

  // Check if session is expired
  if (session.expiresAt.toMillis() < now.toMillis()) {
    throw new HttpsError('failed-precondition', 'Session has expired');
  }

  // Verify caller is the host
  if (session.createdByUid !== auth.uid) {
    throw new HttpsError(
      'permission-denied',
      'Only the host can view session members'
    );
  }

  // Get all members
  const membersSnap = await sessionRef.collection('members').get();
  const members: MemberInfo[] = membersSnap.docs.map((doc) => {
    const member = doc.data() as SessionMember;
    return {
      uid: member.uid,
      displayName: member.displayName,
      role: member.role,
      ready: member.ready,
      joinedAt: member.joinedAt.toDate().toISOString(),
    };
  });

  // Sort: host first, then by joinedAt
  members.sort((a, b) => {
    if (a.role === 'host' && b.role !== 'host') return -1;
    if (a.role !== 'host' && b.role === 'host') return 1;
    return a.joinedAt.localeCompare(b.joinedAt);
  });

  console.log(
    `[getSessionMembers] Host ${auth.uid} fetched ${members.length} members from session ${sessionId}`
  );

  return { ok: true, members };
});
