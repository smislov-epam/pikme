/**
 * Registration Invite Redemption (REQ-101)
 *
 * Cloud Function to validate and redeem registration invites.
 * Called after user authenticates to grant host eligibility.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { hashToken } from '../utils/tokenHash.js';
import { validateInvite, InviteErrorCodes } from './inviteValidation.js';

/**
 * Registration invite document structure.
 */
interface RegistrationInvite {
  inviteTokenHash: string;
  maxUses: number;
  uses: number;
  expiresAt: Timestamp;
  revoked: boolean;
  createdAt: Timestamp;
  createdByUid: string;
}

/**
 * User document structure.
 */
interface UserDoc {
  uid: string;
  email: string | null;
  displayName: string | null;
  invited: boolean;
  createdAt: Timestamp;
  invitedAt: Timestamp | null;
  disabled: boolean;
}

/**
 * Redeem a registration invite.
 *
 * Request: { inviteToken: string }
 * Response: { ok: true, uid: string }
 */
export const redeemRegistrationInvite = onCall(async (request) => {
  const { auth, data } = request;

  // 1. Require authentication
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'Must be authenticated to redeem invite');
  }

  const { inviteToken } = data as { inviteToken?: string };
  if (!inviteToken || typeof inviteToken !== 'string') {
    throw new HttpsError('invalid-argument', 'inviteToken is required');
  }

  const db = getFirestore();
  const uid = auth.uid;
  const email = auth.token.email || null;
  // Get displayName from auth token (set via updateProfile) or request data
  const displayName = auth.token.name || (data as { displayName?: string }).displayName || null;

  // 2. Check if user is already registered (has invited=true)
  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();

  if (userSnap.exists) {
    const userData = userSnap.data() as UserDoc;
    if (userData.invited) {
      throw new HttpsError('already-exists', 'User is already registered', {
        code: InviteErrorCodes.ALREADY_REGISTERED,
      });
    }
  }

  // 3. Hash the token and find matching invite
  const tokenHash = hashToken(inviteToken);
  const invitesRef = db.collection('registrationInvites');
  const inviteQuery = invitesRef.where('inviteTokenHash', '==', tokenHash).limit(1);
  const inviteSnap = await inviteQuery.get();

  if (inviteSnap.empty) {
    throw new HttpsError('not-found', 'Invalid invite token', {
      code: InviteErrorCodes.INVALID_INVITE,
    });
  }

  const inviteDoc = inviteSnap.docs[0];
  const invite = inviteDoc.data() as RegistrationInvite;

  // 4. Validate invite status using pure validation logic
  const now = Timestamp.now();
  const validationResult = validateInvite(
    {
      maxUses: invite.maxUses,
      uses: invite.uses,
      expiresAtMs: invite.expiresAt.toMillis(),
      revoked: invite.revoked,
    },
    now.toMillis()
  );

  if (!validationResult.valid) {
    const grpcCode = validationResult.code === InviteErrorCodes.INVITE_EXHAUSTED
      ? 'resource-exhausted'
      : 'failed-precondition';
    throw new HttpsError(grpcCode, validationResult.message, {
      code: validationResult.code,
    });
  }

  // 5. Atomically update invite uses and create/update user
  const batch = db.batch();

  // Increment invite uses
  batch.update(inviteDoc.ref, {
    uses: FieldValue.increment(1),
  });

  // Create or update user document
  const userDocData: UserDoc = {
    uid,
    email,
    displayName,
    invited: true,
    createdAt: userSnap.exists
      ? (userSnap.data() as UserDoc).createdAt
      : now,
    invitedAt: now,
    disabled: false,
  };
  batch.set(userRef, userDocData, { merge: true });

  await batch.commit();

  console.log(`[redeemRegistrationInvite] User ${uid} redeemed invite ${inviteDoc.id}`);

  return { ok: true, uid };
});
