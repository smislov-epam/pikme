/**
 * Session Functions Index (REQ-102, REQ-103)
 */

// REQ-102: Session creation
export { createSession } from './createSession.js';

// REQ-103: Guest join flow
export { getSessionPreview } from './getSessionPreview.js';
export { claimSessionSlot } from './claimSessionSlot.js';
export { setGuestReady } from './setGuestReady.js';
export { getSessionGames } from './getSessionGames.js';
export { getSessionMembers } from './getSessionMembers.js';
export { getSharedPreferences } from './getSharedPreferences.js';
export { removeSessionGuest } from './removeSessionGuest.js';

// REQ-103: Guest preferences sync
export { submitGuestPreferences } from './submitGuestPreferences.js';
export { getAllGuestPreferences } from './getAllGuestPreferences.js';

export * from './types.js';
