/**
 * Session Types (REQ-102)
 *
 * Firestore document types for session creation and game sharing.
 */

import type { Timestamp } from 'firebase-admin/firestore';

/**
 * Shared game document in `games/{gameId}`.
 * Write-once: created if missing, never overwritten.
 */
export interface SharedGame {
  /** BGG game ID (doc id) */
  gameId: string;
  /** Game name */
  name: string;
  /** Minimum players */
  minPlayers: number | null;
  /** Maximum players */
  maxPlayers: number | null;
  /** Playing time in minutes */
  playingTimeMinutes: number | null;
  /** Thumbnail URL */
  thumbnail: string | null;
  /** Full-size image URL */
  image: string | null;
  /** Game mechanics */
  mechanics: string[];
  /** Game categories */
  categories: string[];
  /** Source of game data */
  source: 'bgg' | 'custom';
  /** When the game was first uploaded */
  createdAt: Timestamp;
  /** UID of user who first uploaded the game */
  createdByUid: string;
}

/**
 * Session document in `sessions/{sessionId}`.
 * Represents a Game Night Session.
 */
export interface Session {
  /** Session ID (doc id) */
  sessionId: string;
  /** Session title */
  title: string;
  /** Host display name (registered user who created the invite) */
  hostDisplayName: string;
  /** When the session was created */
  createdAt: Timestamp;
  /** UID of the host who created the session */
  createdByUid: string;
  /** Scheduled date/time for the game night */
  scheduledFor: Timestamp;
  /** Maximum number of participants (including host) */
  capacity: number;
  /** Filter: minimum players (from host wizard) */
  minPlayers: number | null;
  /** Filter: maximum players (from host wizard) */
  maxPlayers: number | null;
  /** Filter: minimum playing time in minutes */
  minPlayingTimeMinutes: number | null;
  /** Filter: maximum playing time in minutes */
  maxPlayingTimeMinutes: number | null;
  /** Session status */
  status: 'open' | 'closed' | 'expired';
  /** When the session expires (for TTL cleanup) */
  expiresAt: Timestamp;
  /** Share mode (quick or detailed) */
  shareMode: 'quick' | 'detailed';
  /** Detailed share only: whether guests can see Other Participants' Picks */
  showOtherParticipantsPicks?: boolean;
  /** When the session was closed */
  closedAt?: Timestamp;
  /** Tonight's Pick selected game (does NOT close the session) */
  selectedGame?: SessionResult;
  /** When the pick was selected */
  selectedAt?: Timestamp;
  /** Tonight's Pick result (set when session is closed) */
  result?: SessionResult;
}

/**
 * Tonight's Pick result stored when session is closed.
 */
export interface SessionResult {
  /** BGG game ID of the winning game */
  gameId: string;
  /** Game name */
  name: string;
  /** Thumbnail URL */
  thumbnail: string | null;
  /** Full-size image URL */
  image: string | null;
  /** Final score */
  score: number;
  /** Min players */
  minPlayers: number | null;
  /** Max players */
  maxPlayers: number | null;
  /** Playing time in minutes */
  playingTimeMinutes: number | null;
}

/**
 * Session game reference in `sessions/{sessionId}/sessionGames/{gameId}`.
 */
export interface SessionGame {
  /** BGG game ID (doc id) */
  gameId: string;
  /** When the game was added to the session */
  addedAt: Timestamp;
}

/**
 * Participant slot in `sessions/{sessionId}/participants/{participantId}`.
 */
export interface Participant {
  /** Participant ID (doc id) */
  participantId: string;
  /** Slot type: named (host) or open (guest slot) */
  slotType: 'named' | 'open';
  /** Display name (null for unclaimed slots) */
  displayName: string | null;
  /** Whether the slot has been claimed */
  claimed: boolean;
  /** UID of user who claimed the slot (null if unclaimed) */
  claimedByUid: string | null;
  /** When the slot was claimed */
  claimedAt: Timestamp | null;
  /** Hashed invite token for this slot (for guest invites) */
  inviteTokenHash: string | null;
  /** When this participant slot expires */
  expiresAt: Timestamp;
}

/**
 * Session member in `sessions/{sessionId}/members/{uid}`.
 * Links a user UID to their participant slot.
 */
export interface SessionMember {
  /** User UID (doc id) */
  uid: string;
  /** Reference to the participant slot */
  participantId: string;
  /** Role in the session */
  role: 'host' | 'guest';
  /** Display name */
  displayName: string;
  /** Whether the member is ready (host is always ready, guests click Ready) */
  ready: boolean;
  /** When the user joined */
  joinedAt: Timestamp;
  /** When this membership expires (matches session TTL) */
  expiresAt: Timestamp;
}

/**
 * Shared preference for a participant in `sessions/{sessionId}/sharedPreferences/{participantId}`.
 * Allows host to pre-share preferences for known players.
 */
export interface SharedPreference {
  /** Participant ID (matches participant slot) */
  participantId: string;
  /** Display name of the player */
  displayName: string;
  /** Preferences for each game */
  preferences: SharedGamePreference[];
  /** When the preferences were shared */
  sharedAt: Timestamp;
  /** Who shared the preferences (host UID) */
  sharedByUid: string;
}

/**
 * Individual game preference within SharedPreference.
 */
export interface SharedGamePreference {
  /** BGG game ID */
  bggId: number;
  /** Preference rank (1 = highest, null = no rank) */
  rank?: number | null;
  /** Whether this is a top pick */
  isTopPick?: boolean;
  /** Whether this is disliked */
  isDisliked?: boolean;
}

/**
 * Request payload for createSession function.
 */
export interface CreateSessionRequest {
  /** Session title (optional, defaults to "Game Night") */
  title?: string;
  /** Scheduled date/time as ISO string (required) */
  scheduledFor: string;
  /** Maximum participants including host (2-12, default = player count) */
  capacity?: number;
  /** Filter: minimum players (from host wizard) */
  minPlayers?: number | null;
  /** Filter: maximum players (from host wizard) */
  maxPlayers?: number | null;
  /** Filter: minimum playing time in minutes */
  minPlayingTimeMinutes?: number | null;
  /** Filter: maximum playing time in minutes */
  maxPlayingTimeMinutes?: number | null;
  /** Host's display name */
  hostDisplayName: string;
  /** Share mode (quick or detailed) */
  shareMode?: 'quick' | 'detailed';
  /** Detailed share only: whether guests can see Other Participants' Picks */
  showOtherParticipantsPicks?: boolean;
  /** BGG game IDs to include in the session */
  gameIds: string[];
  /** Game data for each game (to upload if missing) */
  games: GameUploadData[];
  /** Named participants with optional shared preferences */
  namedParticipants?: NamedParticipantData[];
  /** Host's preferences (for detailed share mode) */
  hostPreferences?: SharedGamePreference[];
}

/**
 * Data for a named participant slot with optional preferences.
 */
export interface NamedParticipantData {
  /** Display name for the slot */
  displayName: string;
  /** Whether to include this player's preferences */
  includePreferences?: boolean;
  /** Player's preferences (if includePreferences is true) */
  preferences?: SharedGamePreference[];
}

/**
 * Game data for upload (subset of SharedGame without timestamps).
 */
export interface GameUploadData {
  gameId: string;
  name: string;
  minPlayers?: number | null;
  maxPlayers?: number | null;
  playingTimeMinutes?: number | null;
  thumbnail?: string | null;
  image?: string | null;
  mechanics?: string[];
  categories?: string[];
  source?: 'bgg' | 'custom';
}

/**
 * Response from createSession function.
 */
export interface CreateSessionResponse {
  ok: true;
  sessionId: string;
  /** Number of games that were newly uploaded */
  gamesUploaded: number;
}

/**
 * Request payload for getSessionPreview function.
 */
export interface GetSessionPreviewRequest {
  sessionId: string;
}

/**
 * Named participant slot info returned in preview (unclaimed only).
 */
export interface NamedSlotInfo {
  /** Participant ID */
  participantId: string;
  /** Display name for the slot */
  displayName: string;
  /** Whether this slot has pre-shared preferences */
  hasSharedPreferences: boolean;
}

/**
 * Response from getSessionPreview function.
 */
export interface GetSessionPreviewResponse {
  ok: true;
  sessionId: string;
  title: string;
  /** Host display name (registered users only can create sessions) */
  hostName?: string;
  scheduledFor: string;
  minPlayers: number | null;
  maxPlayers: number | null;
  minPlayingTimeMinutes: number | null;
  maxPlayingTimeMinutes: number | null;
  gameCount: number;
  status: 'open' | 'closed' | 'expired';
  capacity: number;
  claimedCount: number;
  availableSlots: number;
  /** Unclaimed named slots (for identity claiming) */
  namedSlots: NamedSlotInfo[];
  /** Share mode (quick or detailed) */
  shareMode: 'quick' | 'detailed';
  /** Detailed share only: whether guests can see Other Participants' Picks */
  showOtherParticipantsPicks?: boolean;
  /** Host UID for ownership check */
  hostUid: string;
  /**
   * Caller's role relative to this session:
   * - 'host': caller is the session creator
   * - 'member': caller has already joined this session
   * - 'guest': caller is not yet a member (new invite)
   * - null: caller is not authenticated
   */
  callerRole: 'host' | 'member' | 'guest' | null;
  /** Member's participant ID if they're already a member */
  callerParticipantId?: string;
  /** Whether caller has marked Ready (only when authenticated and already a member/host) */
  callerReady?: boolean;
  /** Selected game (present when host picked a game, even if session is still open) */
  selectedGame?: SessionResult;
  /** When selectedGame was set (ISO string) */
  selectedAt?: string;
  /** Tonight's Pick result (only present when status is 'closed') */
  result?: SessionResult;
}

/**
 * Request payload for claimSessionSlot function.
 */
export interface ClaimSessionSlotRequest {
  sessionId: string;
  displayName: string;
  /** Optional: claim a specific named participant slot */
  participantId?: string;
}

/**
 * Response from claimSessionSlot function.
 */
export interface ClaimSessionSlotResponse {
  ok: true;
  participantId: string;
  sessionId: string;
  /** Whether this slot has shared preferences to import */
  hasSharedPreferences: boolean;
}

/**
 * Request payload for setGuestReady function.
 */
export interface SetGuestReadyRequest {
  sessionId: string;
}

/**
 * Response from setGuestReady function.
 */
export interface SetGuestReadyResponse {
  ok: true;
}

/**
 * Request payload for removeSessionGuest function.
 */
export interface RemoveSessionGuestRequest {
  sessionId: string;
  guestUid: string;
}

/**
 * Response from removeSessionGuest function.
 */
export interface RemoveSessionGuestResponse {
  ok: true;
}

/**
 * Request payload for getSessionGames function.
 */
export interface GetSessionGamesRequest {
  sessionId: string;
}

/**
 * Game data returned to guests (without owner info for privacy).
 */
export interface SessionGameData {
  gameId: string;
  name: string;
  minPlayers: number | null;
  maxPlayers: number | null;
  playingTimeMinutes: number | null;
  thumbnail: string | null;
  image: string | null;
  mechanics: string[];
  categories: string[];
  source: 'bgg' | 'custom';
}

/**
 * Response from getSessionGames function.
 */
export interface GetSessionGamesResponse {
  ok: true;
  games: SessionGameData[];
}

/**
 * Request payload for getSessionMembers function.
 */
export interface GetSessionMembersRequest {
  sessionId: string;
}

/**
 * Member info returned to host.
 */
export interface MemberInfo {
  uid: string;
  displayName: string;
  role: 'host' | 'guest';
  ready: boolean;
  joinedAt: string;
}

/**
 * Response from getSessionMembers function.
 */
export interface GetSessionMembersResponse {
  ok: true;
  members: MemberInfo[];
}

/**
 * Request payload for getSharedPreferences function.
 */
export interface GetSharedPreferencesRequest {
  sessionId: string;
}

/**
 * Response from getSharedPreferences function.
 */
export interface GetSharedPreferencesResponse {
  ok: true;
  /** Whether shared preferences exist for this slot */
  hasPreferences: boolean;
  /** The preferences (empty if hasPreferences is false) */
  preferences: SharedGamePreference[];
  /** Display name from the shared preferences */
  displayName: string | null;
}

/**
 * Request payload for submitGuestPreferences function.
 */
export interface SubmitGuestPreferencesRequest {
  sessionId: string;
  preferences: SharedGamePreference[];
  /**
   * Optional: For hosts submitting on behalf of a local user.
   * If provided, the preferences will be saved under this participantId
   * in sharedPreferences, allowing other participants to see them.
   */
  forLocalUser?: {
    /** Unique participantId for this local user (e.g., the local username) */
    participantId: string;
    /** Display name to show in participant lists */
    displayName: string;
  };
}

/**
 * Response from submitGuestPreferences function.
 */
export interface SubmitGuestPreferencesResponse {
  ok: true;
  preferencesCount: number;
}

/**
 * Request payload for getAllGuestPreferences function.
 */
export interface GetAllGuestPreferencesRequest {
  sessionId: string;
}

/**
 * Guest preferences data returned to host.
 */
export interface GuestPreferencesData {
  uid: string;
  participantId: string;
  displayName: string;
  preferences: SharedGamePreference[];
  ready: boolean;
  updatedAt: string | null;
}

/**
 * Response from getAllGuestPreferences function.
 */
export interface GetAllGuestPreferencesResponse {
  ok: true;
  guests: GuestPreferencesData[];
}
