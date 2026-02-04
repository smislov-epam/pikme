/**
 * User Management (REQ-111)
 *
 * Cloud Functions for managing registered users.
 * Handles listing, revoking, and restoring user access.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth, UserRecord } from 'firebase-admin/auth';
import { isAdmin, requireAdmin } from '../utils/adminUtils.js';
import { logAudit, AuditAction } from '../utils/auditLog.js';

/**
 * Check if the current user is an admin.
 * Uses Auth API to get the latest custom claims (not cached token).
 */
export const checkAdminStatus = onCall(async (request) => {
  const { auth } = request;

  if (!auth?.uid) {
    return { isAdmin: false };
  }

  // Use isAdmin() to query Auth API for latest claims
  // This is slower but ensures we get the most current admin status
  const adminStatus = await isAdmin(auth.uid);
  return { isAdmin: adminStatus };
});

/**
 * Batch size for fetching users from Firebase Auth.
 * Firebase Auth listUsers API supports up to 1000 users per page.
 */
const AUTH_BATCH_SIZE = 100;

/**
 * List registered users (admin only).
 * Optimized to batch fetch from Firebase Auth to avoid N+1 queries.
 */
export const listUsers = onCall(async (request) => {
  const { auth, data } = request;

  requireAdmin(auth);

  const { filter = 'all' } = data as { filter?: 'all' | 'active' | 'disabled' };
  const db = getFirestore();
  const firebaseAuth = getAuth();

  let query = db.collection('users').orderBy('createdAt', 'desc');

  if (filter === 'active') {
    query = query.where('disabled', '==', false);
  } else if (filter === 'disabled') {
    query = query.where('disabled', '==', true);
  }

  const snapshot = await query.limit(AUTH_BATCH_SIZE).get();

  if (snapshot.empty) {
    return { users: [] };
  }

  // Collect all UIDs for batch lookup
  const uids = snapshot.docs.map((doc) => doc.id);

  // Batch fetch user data from Firebase Auth
  // Use getUsers() for batch lookup instead of individual getUser() calls
  const authUsersResult = await firebaseAuth.getUsers(
    uids.map((uid) => ({ uid }))
  );

  // Create a map for quick lookup
  const authUserMap = new Map<string, UserRecord>();
  for (const user of authUsersResult.users) {
    authUserMap.set(user.uid, user);
  }

  // Build user response with auth data
  const users = snapshot.docs.map((doc) => {
    const data = doc.data();
    const authUser = authUserMap.get(doc.id);

    return {
      uid: doc.id,
      email: authUser?.email || data.email || null,
      displayName: authUser?.displayName || data.displayName || null,
      emailVerified: authUser?.emailVerified || false,
      invited: data.invited || false,
      disabled: data.disabled || false,
      createdAt: data.createdAt?.toDate().toISOString() || null,
    };
  });

  return { users };
});

/**
 * Revoke user access (admin only).
 */
export const revokeUserAccess = onCall(async (request) => {
  const { auth, data } = request;

  requireAdmin(auth);

  const { uid } = data as { uid: string };

  if (!uid) {
    throw new HttpsError('invalid-argument', 'uid is required');
  }

  // Prevent admin from revoking their own access
  if (uid === auth!.uid) {
    throw new HttpsError('failed-precondition', 'Cannot revoke your own access');
  }

  const db = getFirestore();
  const userRef = db.collection('users').doc(uid);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new HttpsError('not-found', 'User not found');
  }

  await userRef.update({ disabled: true });

  // Audit log: user access revoked
  const userData = userDoc.data();
  logAudit(AuditAction.USER_ACCESS_REVOKED, {
    actorUid: auth!.uid,
    targetId: uid,
    targetEmail: userData?.email || null,
  });

  return { ok: true };
});

/**
 * Restore user access (admin only).
 */
export const restoreUserAccess = onCall(async (request) => {
  const { auth, data } = request;

  requireAdmin(auth);

  const { uid } = data as { uid: string };

  if (!uid) {
    throw new HttpsError('invalid-argument', 'uid is required');
  }

  const db = getFirestore();
  const userRef = db.collection('users').doc(uid);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new HttpsError('not-found', 'User not found');
  }

  await userRef.update({ disabled: false });

  // Audit log: user access restored
  const userData = userDoc.data();
  logAudit(AuditAction.USER_ACCESS_RESTORED, {
    actorUid: auth!.uid,
    targetId: uid,
    targetEmail: userData?.email || null,
  });

  return { ok: true };
});
