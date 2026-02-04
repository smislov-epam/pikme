/**
 * Admin Utilities (REQ-111)
 *
 * Utility functions for admin identification and authorization.
 * Admin status is determined by Firebase Custom Claims.
 *
 * To set a user as admin:
 * 1. Firebase Console > Authentication > Users > Select user > Custom claims > {"role": "admin"}
 * 2. Or use Admin SDK: admin.auth().setCustomUserClaims(uid, { role: 'admin' })
 *
 * IMPORTANT: The claim format is { role: 'admin' }, NOT { admin: true }.
 * Note: User must sign out and sign back in for new claims to take effect.
 */

import { HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { defineString } from 'firebase-functions/params';

/**
 * Auth data from callable function request.
 * Matches the auth property of CallableRequest.
 */
interface AuthContext {
  uid: string;
  token: {
    role?: string;
    [key: string]: unknown;
  };
}

/**
 * Admin notification email parameter.
 * Set via Firebase Functions config or environment variable.
 */
const adminEmailParam = defineString('ADMIN_EMAIL', {
  default: '',
  description: 'Email address for admin notifications',
});

/**
 * Check if a user is an admin via custom claims.
 * This makes an API call to Firebase Auth - prefer isAdminFromToken when possible.
 *
 * @param uid - Firebase Auth UID to check
 * @returns true if the user has role: 'admin' custom claim
 */
export async function isAdmin(uid: string): Promise<boolean> {
  if (!uid) return false;

  try {
    const user = await getAuth().getUser(uid);
    return user.customClaims?.role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Check admin status from auth token (most efficient - no API call).
 * Use this in Cloud Functions where you have the auth context.
 *
 * @param auth - The auth data from callable function request
 * @returns true if the user has role: 'admin' in their token
 */
export function isAdminFromToken(auth: AuthContext | undefined): boolean {
  if (!auth?.token) return false;
  return auth.token.role === 'admin';
}

/**
 * Get the admin notification email address.
 *
 * @returns Admin email or null if not configured
 */
export function getAdminEmail(): string | null {
  const email = adminEmailParam.value();
  return email || null;
}

/**
 * Require admin authorization from auth token.
 * Throws HttpsError if the user is not authenticated or not an admin.
 *
 * @param auth - The auth data from callable function request
 * @throws HttpsError if not authenticated or not an admin
 */
export function requireAdmin(auth: AuthContext | undefined): void {
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }

  if (!isAdminFromToken(auth)) {
    throw new HttpsError('permission-denied', 'Admin access required');
  }
}

/**
 * Get the admin's email address from UID.
 *
 * @param uid - The admin's UID
 * @returns The email or null
 */
export async function getAdminEmailByUid(uid: string): Promise<string | null> {
  try {
    const user = await getAuth().getUser(uid);
    return user.email || null;
  } catch {
    return null;
  }
}
