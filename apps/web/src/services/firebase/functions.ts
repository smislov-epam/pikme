/**
 * Firebase Functions Client (REQ-101)
 *
 * Client-side wrappers for calling Cloud Functions.
 */

import { getFunctionsInstance } from './init';

/**
 * Redeem a registration invite token.
 * Must be called after user is authenticated.
 */
export async function redeemRegistrationInvite(
  inviteToken: string
): Promise<{ ok: boolean; uid: string }> {
  const functions = getFunctionsInstance();
  if (!functions) throw new Error('Firebase not initialized');

  const { httpsCallable } = await import('firebase/functions');
  const callable = httpsCallable<{ inviteToken: string }, { ok: boolean; uid: string }>(
    functions,
    'redeemRegistrationInvite'
  );

  const result = await callable({ inviteToken });
  return result.data;
}

/**
 * Error codes that can be returned by registration invite redemption.
 */
export const RegistrationErrorCodes = {
  INVALID_INVITE: 'invalid-invite',
  EXPIRED_INVITE: 'expired-invite',
  INVITE_EXHAUSTED: 'invite-exhausted',
  INVITE_REVOKED: 'invite-revoked',
  ALREADY_REGISTERED: 'already-registered',
  UNAUTHENTICATED: 'unauthenticated',
} as const;

/**
 * Extract error code from a Firebase Functions error.
 */
export function getRegistrationErrorCode(error: unknown): string | null {
  if (error && typeof error === 'object' && 'details' in error) {
    const details = (error as { details?: { code?: string } }).details;
    if (details?.code) return details.code;
  }
  return null;
}
