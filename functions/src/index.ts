/**
 * Firebase Cloud Functions (REQ-100)
 *
 * Entry point for all Cloud Functions.
 * Functions are added incrementally as features are implemented.
 */

import { initializeApp } from 'firebase-admin/app';
import { onRequest } from 'firebase-functions/v2/https';

// Initialize Firebase Admin (required for Firestore access)
initializeApp();

// REQ-101: Registration invites
export { redeemRegistrationInvite } from './registration/index.js';

/**
 * Health check endpoint for testing emulator connectivity.
 */
export const healthCheck = onRequest((request, response) => {
  response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Firebase Functions are running',
  });
});

// Future functions will be added here:
// - createSession (REQ-102)
// - redeemSessionInvite (REQ-103)
// - syncPreferences (REQ-104)
