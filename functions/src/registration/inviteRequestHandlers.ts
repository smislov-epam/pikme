/**
 * Invite Request Handlers (REQ-111)
 *
 * Cloud Functions for managing registration invite requests.
 * Handles listing, approving, and rejecting user requests.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { requireAdmin } from '../utils/adminUtils.js';
import { generateToken, hashToken } from '../utils/tokenHash.js';
import { logAudit, AuditAction } from '../utils/auditLog.js';
import type { InviteRequestDoc, InviteRequestStatus } from './requestTypes.js';

/**
 * Check if running in Firebase emulator (local development).
 */
function isEmulatorEnvironment(): boolean {
  return process.env.FUNCTIONS_EMULATOR === 'true';
}

/**
 * Get the app URL based on environment.
 * Uses localhost in emulator mode, production URL otherwise.
 */
function getAppUrl(): string {
  if (isEmulatorEnvironment()) {
    return 'http://localhost:5173';
  }
  return 'https://pikme.online';
}

/**
 * Default invite expiration in days.
 */
const DEFAULT_INVITE_EXPIRY_DAYS = 7;

/**
 * List invite requests (admin only).
 */
export const listInviteRequests = onCall(async (request) => {
  const { auth, data } = request;

  requireAdmin(auth);

  const { status = 'pending' } = data as { status?: InviteRequestStatus | 'all' };
  const db = getFirestore();

  let query = db.collection('inviteRequests').orderBy('requestedAt', 'desc');

  if (status !== 'all') {
    query = query.where('status', '==', status);
  }

  const snapshot = await query.limit(100).get();

  const requests = snapshot.docs.map((doc) => {
    const data = doc.data() as InviteRequestDoc;
    return {
      requestId: doc.id,
      email: data.email,
      displayName: data.displayName,
      message: data.message,
      status: data.status,
      requestedAt: data.requestedAt.toDate().toISOString(),
      processedAt: data.processedAt?.toDate().toISOString() || null,
      processedByUid: data.processedByUid,
      rejectionReason: data.rejectionReason,
    };
  });

  return { requests };
});

/**
 * Approve an invite request (admin only).
 * Creates a registration invite and updates the request status atomically.
 * Uses a Firestore transaction to ensure data consistency.
 */
export const approveInviteRequest = onCall(async (request) => {
  const { auth, data } = request;

  requireAdmin(auth);

  const { requestId } = data as { requestId: string };

  if (!requestId) {
    throw new HttpsError('invalid-argument', 'requestId is required');
  }

  const db = getFirestore();
  const requestRef = db.collection('inviteRequests').doc(requestId);

  // Generate invite token outside transaction (crypto operations)
  const inviteToken = generateToken();
  const inviteTokenHash = hashToken(inviteToken);

  // Create timestamp once for consistency within transaction
  const now = Timestamp.now();

  // Use transaction to ensure atomicity
  const result = await db.runTransaction(async (transaction) => {
    const requestDoc = await transaction.get(requestRef);

    if (!requestDoc.exists) {
      throw new HttpsError('not-found', 'Request not found');
    }

    const requestData = requestDoc.data() as InviteRequestDoc;

    if (requestData.status !== 'pending') {
      throw new HttpsError('failed-precondition', 'Request has already been processed');
    }

    // Create registration invite
    const expiresAt = Timestamp.fromMillis(
      now.toMillis() + DEFAULT_INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    );

    const inviteRef = db.collection('registrationInvites').doc();
    
    // Write invite document
    // Store both token (for admin retrieval) and hash (for validation)
    transaction.set(inviteRef, {
      inviteToken,
      inviteTokenHash,
      maxUses: 1,
      uses: 0,
      expiresAt,
      revoked: false,
      createdAt: now,
      createdByUid: auth!.uid,
      forEmail: requestData.email,
    });

    // Update request status
    transaction.update(requestRef, {
      status: 'approved',
      processedAt: now,
      processedByUid: auth!.uid,
    });

    return {
      inviteId: inviteRef.id,
      email: requestData.email,
    };
  });

  // Build the invite link
  const inviteLink = `${getAppUrl()}/register?token=${inviteToken}`;

  // Audit log: invite approved
  logAudit(AuditAction.INVITE_APPROVED, {
    actorUid: auth!.uid,
    targetId: requestId,
    targetEmail: result.email,
    details: { inviteId: result.inviteId },
  });

  return {
    ok: true,
    inviteId: result.inviteId,
    inviteLink,
    email: result.email,
  };
});

/**
 * Reject an invite request (admin only).
 */
export const rejectInviteRequest = onCall(async (request) => {
  const { auth, data } = request;

  requireAdmin(auth);

  const { requestId, reason } = data as { requestId: string; reason: string };

  if (!requestId) {
    throw new HttpsError('invalid-argument', 'requestId is required');
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    throw new HttpsError('invalid-argument', 'Rejection reason is required');
  }

  const db = getFirestore();
  const requestRef = db.collection('inviteRequests').doc(requestId);
  const requestDoc = await requestRef.get();

  if (!requestDoc.exists) {
    throw new HttpsError('not-found', 'Request not found');
  }

  const requestData = requestDoc.data() as InviteRequestDoc;

  if (requestData.status !== 'pending') {
    throw new HttpsError('failed-precondition', 'Request has already been processed');
  }

  await requestRef.update({
    status: 'rejected',
    processedAt: Timestamp.now(),
    processedByUid: auth!.uid,
    rejectionReason: reason.trim(),
  });

  // Audit log: invite rejected
  logAudit(AuditAction.INVITE_REJECTED, {
    actorUid: auth!.uid,
    targetId: requestId,
    targetEmail: requestData.email,
    details: { reason: reason.trim() },
  });

  return {
    ok: true,
    email: requestData.email,
  };
});
