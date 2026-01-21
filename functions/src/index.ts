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

// REQ-109: BGG API proxy (CORS workaround)
export { bggProxy } from './bgg/index.js';

// REQ-102: Session creation
export { createSession } from './session/index.js';

// REQ-103: Guest join flow
export {
  getSessionPreview,
  claimSessionSlot,
  setGuestReady,
  getSessionGames,
  getSessionMembers,
  getSharedPreferences,
  removeSessionGuest,
  submitGuestPreferences,
  getAllGuestPreferences,
} from './session/index.js';

// REQ-106: Session lifecycle and participant visibility
export {
  closeSession,
  deleteSession,
  setSessionSelectedGame,
  getReadyParticipantPreferences,
} from './session/index.js';

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
