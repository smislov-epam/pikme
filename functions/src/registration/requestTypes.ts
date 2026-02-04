/**
 * Registration Request Types (REQ-111)
 *
 * Type definitions for invite request handling.
 */

import type { Timestamp } from 'firebase-admin/firestore';

/**
 * Status of an invite request.
 */
export type InviteRequestStatus = 'pending' | 'approved' | 'rejected';

/**
 * Invite request document structure in Firestore.
 */
export interface InviteRequestDoc {
  email: string;
  displayName: string;
  message: string;
  status: InviteRequestStatus;
  requestedAt: Timestamp;
  processedAt: Timestamp | null;
  processedByUid: string | null;
  rejectionReason: string | null;
  ipHash: string;
}

/**
 * Request payload for submitting a registration request.
 */
export interface RequestRegistrationInviteRequest {
  email: string;
  displayName: string;
  message?: string;
  recaptchaToken?: string;
}

/**
 * Response for successful registration request submission.
 */
export interface RequestRegistrationInviteResponse {
  ok: true;
  requestId: string;
}

/**
 * Error codes for registration request failures.
 */
export const RequestErrorCodes = {
  INVALID_EMAIL: 'invalid-email',
  INVALID_DISPLAY_NAME: 'invalid-display-name',
  DUPLICATE_EMAIL: 'duplicate-email',
  DUPLICATE_REQUEST: 'duplicate-request',
  RATE_LIMITED: 'rate-limited',
  RECAPTCHA_FAILED: 'recaptcha-failed',
  RECENTLY_REJECTED: 'recently-rejected',
} as const;

export type RequestErrorCode = (typeof RequestErrorCodes)[keyof typeof RequestErrorCodes];
