/**
 * Request Registration Invite (REQ-111)
 *
 * Cloud Function for unauthenticated users to request registration access.
 * Validates input, checks for duplicates, and creates invite request.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { hashToken } from '../utils/tokenHash.js';
import { RequestErrorCodes } from './requestTypes.js';
import type {
  InviteRequestDoc,
  RequestRegistrationInviteRequest,
} from './requestTypes.js';

/**
 * Check if running in Firebase emulator (local development).
 */
function isEmulatorEnvironment(): boolean {
  return process.env.FUNCTIONS_EMULATOR === 'true';
}

/**
 * Rate limit: max requests per IP per hour.
 * Very restrictive to prevent abuse without reCAPTCHA.
 */
const MAX_REQUESTS_PER_IP_PER_HOUR = 1;

/**
 * Rate limit: max requests per IP per day (rolling 24h window).
 */
const MAX_REQUESTS_PER_IP_PER_DAY = 3;

/**
 * Minimum days before a rejected user can request again.
 */
const REJECTION_COOLDOWN_DAYS = 7;

/**
 * Validate email format.
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate display name (2-50 chars).
 */
function isValidDisplayName(name: string): boolean {
  return name.length >= 2 && name.length <= 50;
}

/**
 * Hash IP address for rate limiting (privacy-preserving).
 */
function hashIp(ip: string): string {
  return hashToken(ip);
}

/**
 * Request a registration invite.
 *
 * This is an unauthenticated endpoint - anyone can request access.
 * Rate limiting is enforced via IP hashing.
 */
export const requestRegistrationInvite = onCall(async (request) => {
  const data = request.data as RequestRegistrationInviteRequest;
  const { email, displayName, message = '' } = data;

  // 1. Validate required fields
  if (!email || typeof email !== 'string') {
    throw new HttpsError('invalid-argument', 'Email is required', {
      code: RequestErrorCodes.INVALID_EMAIL,
    });
  }

  if (!isValidEmail(email.trim())) {
    throw new HttpsError('invalid-argument', 'Invalid email format', {
      code: RequestErrorCodes.INVALID_EMAIL,
    });
  }

  if (!displayName || typeof displayName !== 'string') {
    throw new HttpsError('invalid-argument', 'Display name is required', {
      code: RequestErrorCodes.INVALID_DISPLAY_NAME,
    });
  }

  if (!isValidDisplayName(displayName.trim())) {
    throw new HttpsError(
      'invalid-argument',
      'Display name must be 2-50 characters',
      { code: RequestErrorCodes.INVALID_DISPLAY_NAME }
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedDisplayName = displayName.trim();
  const normalizedMessage = (message || '').trim().slice(0, 500);

  const db = getFirestore();

  // 2. Get IP for rate limiting
  const rawIp = request.rawRequest?.ip || 'unknown';
  const ipHash = hashIp(rawIp);

  // 3. Check rate limit (skip in emulator mode for easier testing)
  if (!isEmulatorEnvironment()) {
    // 3a. Check hourly rate limit (max requests per IP per hour)
    const oneHourAgo = Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);
    const recentRequestsQuery = db
      .collection('inviteRequests')
      .where('ipHash', '==', ipHash)
      .where('requestedAt', '>', oneHourAgo);

    const recentRequests = await recentRequestsQuery.get();
    if (recentRequests.size >= MAX_REQUESTS_PER_IP_PER_HOUR) {
      throw new HttpsError(
        'resource-exhausted',
        'Too many requests. Please try again later.',
        { code: RequestErrorCodes.RATE_LIMITED }
      );
    }

    // 3b. Check daily rate limit (more restrictive than hourly)
    const oneDayAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
    const dailyRequestsQuery = db
      .collection('inviteRequests')
      .where('ipHash', '==', ipHash)
      .where('requestedAt', '>', oneDayAgo);

    const dailyRequests = await dailyRequestsQuery.get();
    if (dailyRequests.size >= MAX_REQUESTS_PER_IP_PER_DAY) {
      throw new HttpsError(
        'resource-exhausted',
        'Daily request limit reached. Please try again tomorrow.',
        { code: RequestErrorCodes.RATE_LIMITED }
      );
    }
  }

  // 4. Check if email already has a registered user
  const usersQuery = db
    .collection('users')
    .where('email', '==', normalizedEmail)
    .limit(1);
  const existingUser = await usersQuery.get();

  if (!existingUser.empty) {
    // Use generic message to prevent email enumeration
    throw new HttpsError(
      'already-exists',
      'Unable to process this request. If you already have an account, please sign in.',
      { code: RequestErrorCodes.DUPLICATE_EMAIL }
    );
  }

  // 5. Check for existing pending request with same email
  const pendingQuery = db
    .collection('inviteRequests')
    .where('email', '==', normalizedEmail)
    .where('status', '==', 'pending')
    .limit(1);
  const pendingRequest = await pendingQuery.get();

  if (!pendingRequest.empty) {
    // Use same generic message to prevent email enumeration
    throw new HttpsError(
      'already-exists',
      'Unable to process this request. If you already have an account, please sign in.',
      { code: RequestErrorCodes.DUPLICATE_REQUEST }
    );
  }

  // 6. Check for recently rejected request (cooldown period)
  const cooldownDate = Timestamp.fromMillis(
    Date.now() - REJECTION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
  );
  const rejectedQuery = db
    .collection('inviteRequests')
    .where('email', '==', normalizedEmail)
    .where('status', '==', 'rejected')
    .where('processedAt', '>', cooldownDate)
    .limit(1);
  const recentlyRejected = await rejectedQuery.get();

  if (!recentlyRejected.empty) {
    throw new HttpsError(
      'failed-precondition',
      `Your previous request was recently declined. You can submit a new request after ${REJECTION_COOLDOWN_DAYS} days.`,
      { code: RequestErrorCodes.RECENTLY_REJECTED }
    );
  }

  // 7. Create the invite request document
  const now = Timestamp.now();
  const inviteRequestData: InviteRequestDoc = {
    email: normalizedEmail,
    displayName: normalizedDisplayName,
    message: normalizedMessage,
    status: 'pending',
    requestedAt: now,
    processedAt: null,
    processedByUid: null,
    rejectionReason: null,
    ipHash,
  };

  const docRef = await db.collection('inviteRequests').add(inviteRequestData);

  return {
    ok: true,
    requestId: docRef.id,
  };
});
