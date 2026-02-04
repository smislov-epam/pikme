/**
 * Invite Management (REQ-111)
 *
 * Cloud Functions for managing registration invites.
 * Handles listing, creating, and revoking invites.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { requireAdmin } from '../utils/adminUtils.js';
import { generateToken, hashToken } from '../utils/tokenHash.js';
import { logAudit, AuditAction } from '../utils/auditLog.js';

/**
 * Email validation regex.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * List registration invites (admin only).
 */
export const listRegistrationInvites = onCall(async (request) => {
  const { auth, data } = request;

  requireAdmin(auth);

  const { includeExpired = false } = data as { includeExpired?: boolean };
  const db = getFirestore();

  const snapshot = await db
    .collection('registrationInvites')
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get();

  const now = Date.now();
  const invites = snapshot.docs
    .map((doc) => {
      const data = doc.data();
      const expiresAtMs = data.expiresAt.toMillis();
      const isExpired = expiresAtMs < now;
      const isRevoked = data.revoked === true;

      return {
        inviteId: doc.id,
        // Return token for unused invites (allows admin to copy link)
        token: data.inviteToken || null,
        maxUses: data.maxUses,
        uses: data.uses,
        expiresAt: data.expiresAt.toDate().toISOString(),
        revoked: isRevoked,
        createdAt: data.createdAt.toDate().toISOString(),
        forEmail: data.forEmail || null,
        email: data.forEmail || null,
        displayName: data.forDisplayName || null,
        isExpired,
        isActive: !isExpired && !isRevoked && data.uses < data.maxUses,
        usedAt: data.usedAt ? data.usedAt.toDate().toISOString() : null,
      };
    })
    // Filter out expired and revoked invites unless includeExpired is true
    .filter((invite) => includeExpired || invite.isActive);

  return { invites };
});

/**
 * Create a new registration invite (admin only).
 */
export const createRegistrationInvite = onCall(async (request) => {
  const { auth, data } = request;

  requireAdmin(auth);

  const { email, displayName, maxUses = 1, expiresInDays = 7 } = data as {
    email?: string;
    displayName?: string;
    maxUses?: number;
    expiresInDays?: number;
  };

  // Validate email format if provided
  if (email && !EMAIL_REGEX.test(email)) {
    throw new HttpsError('invalid-argument', 'Invalid email format');
  }

  // Validate displayName length if provided
  if (displayName && (displayName.length < 2 || displayName.length > 50)) {
    throw new HttpsError('invalid-argument', 'Display name must be 2-50 characters');
  }

  // Validate and clamp inputs
  const validMaxUses = Math.min(Math.max(1, maxUses), 100);
  const validExpiresInDays = Math.min(Math.max(1, expiresInDays), 30);

  const inviteToken = generateToken();
  const inviteTokenHash = hashToken(inviteToken);

  const expiresAt = Timestamp.fromMillis(
    Date.now() + validExpiresInDays * 24 * 60 * 60 * 1000
  );

  const createdAt = Timestamp.now();

  const db = getFirestore();
  // Store both token (for admin retrieval) and hash (for validation)
  const inviteRef = await db.collection('registrationInvites').add({
    inviteToken,
    inviteTokenHash,
    maxUses: validMaxUses,
    uses: 0,
    expiresAt,
    revoked: false,
    createdAt,
    createdByUid: auth!.uid,
    forEmail: email || null,
    forDisplayName: displayName || null,
  });

  // Audit log: invite created
  logAudit(AuditAction.INVITE_CREATED, {
    actorUid: auth!.uid,
    targetId: inviteRef.id,
    targetEmail: email || null,
    details: { maxUses: validMaxUses, expiresInDays: validExpiresInDays },
  });

  // Return the full invite object that the frontend expects
  return {
    ok: true,
    invite: {
      inviteId: inviteRef.id,
      token: inviteToken,
      maxUses: validMaxUses,
      uses: 0,
      expiresAt: expiresAt.toDate().toISOString(),
      revoked: false,
      createdAt: createdAt.toDate().toISOString(),
      forEmail: email || null,
      email: email || null,
      displayName: displayName || null,
      isExpired: false,
      isActive: true,
      usedAt: null,
    },
  };
});

/**
 * Revoke a registration invite (admin only).
 */
export const revokeRegistrationInvite = onCall(async (request) => {
  const { auth, data } = request;

  requireAdmin(auth);

  const { inviteId } = data as { inviteId: string };

  if (!inviteId) {
    throw new HttpsError('invalid-argument', 'inviteId is required');
  }

  const db = getFirestore();
  const inviteRef = db.collection('registrationInvites').doc(inviteId);
  const inviteDoc = await inviteRef.get();

  if (!inviteDoc.exists) {
    throw new HttpsError('not-found', 'Invite not found');
  }

  await inviteRef.update({ revoked: true });

  // Audit log: invite revoked
  const inviteData = inviteDoc.data();
  logAudit(AuditAction.INVITE_REVOKED, {
    actorUid: auth!.uid,
    targetId: inviteId,
    targetEmail: inviteData?.forEmail || null,
  });

  return { ok: true };
});
