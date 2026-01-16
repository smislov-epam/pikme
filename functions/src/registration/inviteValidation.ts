/**
 * Invite Validation Logic (REQ-101)
 *
 * Pure functions for validating registration invites.
 * Extracted for testability - no Firebase dependencies.
 */

/**
 * Error codes for invite validation failures.
 */
export const InviteErrorCodes = {
  INVALID_INVITE: 'invalid-invite',
  EXPIRED_INVITE: 'expired-invite',
  INVITE_EXHAUSTED: 'invite-exhausted',
  INVITE_REVOKED: 'invite-revoked',
  ALREADY_REGISTERED: 'already-registered',
  UNAUTHENTICATED: 'unauthenticated',
} as const;

export type InviteErrorCode = (typeof InviteErrorCodes)[keyof typeof InviteErrorCodes];

/**
 * Invite data for validation (subset of Firestore doc).
 */
export interface InviteData {
  maxUses: number;
  uses: number;
  expiresAtMs: number;
  revoked: boolean;
}

/**
 * Validation result.
 */
export type ValidationResult =
  | { valid: true }
  | { valid: false; code: InviteErrorCode; message: string };

/**
 * Validate an invite for redemption.
 *
 * @param invite - The invite data to validate
 * @param nowMs - Current timestamp in milliseconds
 * @returns Validation result with error code if invalid
 */
export function validateInvite(invite: InviteData, nowMs: number): ValidationResult {
  if (invite.revoked) {
    return {
      valid: false,
      code: InviteErrorCodes.INVITE_REVOKED,
      message: 'Invite has been revoked',
    };
  }

  if (invite.expiresAtMs < nowMs) {
    return {
      valid: false,
      code: InviteErrorCodes.EXPIRED_INVITE,
      message: 'Invite has expired',
    };
  }

  if (invite.uses >= invite.maxUses) {
    return {
      valid: false,
      code: InviteErrorCodes.INVITE_EXHAUSTED,
      message: 'Invite has reached maximum uses',
    };
  }

  return { valid: true };
}
