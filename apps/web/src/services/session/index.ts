/**
 * Session Services Index (REQ-102, REQ-103)
 */

export {
  createSession,
  getSessionLink,
  getSessionPreview,
  claimSessionSlot,
  setGuestReady,
  getSessionGames,
  getSessionMembers,
  removeSessionGuest,
  getSharedPreferences,
  submitGuestPreferences,
  getAllGuestPreferences,
  markParticipantReady,
} from './sessionService';
export {
  hydrateSessionGames,
  getSessionHostUsername,
  isSessionHost,
} from './hydrateSessionGames';
export type {
  CreateSessionOptions,
  CreateSessionResult,
  SessionGameData,
  SessionPreview,
  ClaimSlotResult,
  SessionGameInfo,
  SessionMemberInfo,
  NamedParticipantData,
  SharedGamePreference,
  SharedPreferencesResult,
  NamedSlotInfo,
  GuestPreferencesData,
} from './types';
