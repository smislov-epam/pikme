/**
 * Session Types (REQ-102, REQ-103) - Client-side
 *
 * Types for session creation and management.
 */

/**
 * Game data for session creation (from Dexie).
 */
export interface SessionGameData {
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
 * Options for creating a session.
 */
export interface CreateSessionOptions {
  /** Session title (optional, defaults to "Game Night") */
  title?: string;
  /** Scheduled date/time (required) */
  scheduledFor: Date;
  /** Maximum participants including host (2-12) */
  capacity?: number;
  /** Filter: minimum players */
  minPlayers?: number | null;
  /** Filter: maximum players */
  maxPlayers?: number | null;
  /** Filter: minimum playing time in minutes */
  minPlayingTimeMinutes?: number | null;
  /** Filter: maximum playing time in minutes */
  maxPlayingTimeMinutes?: number | null;
  /** Host's display name */
  hostDisplayName: string;
  /** Share mode (quick or detailed) */
  shareMode?: 'quick' | 'detailed';
  /** Games to include in the session */
  games: SessionGameData[];
  /** Named participants with optional shared preferences */
  namedParticipants?: NamedParticipantData[];
}

/**
 * Result from session creation.
 */
export interface CreateSessionResult {
  sessionId: string;
  gamesUploaded: number;
}

/**
 * Named slot info for identity claiming.
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
 * Session preview for join page.
 */
export interface SessionPreview {
  sessionId: string;
  title: string;
  scheduledFor: Date;
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
  /** Host's display name */
  hostName?: string;
  /** Host's Firebase UID (for cross-device recognition) */
  hostUid?: string;
}

/**
 * Result from claiming a session slot.
 */
export interface ClaimSlotResult {
  participantId: string;
  sessionId: string;
  /** Whether this slot has shared preferences to import */
  hasSharedPreferences: boolean;
}

/**
 * Game data returned from getSessionGames (without owner info).
 */
export interface SessionGameInfo {
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
 * Member info returned from getSessionMembers.
 */
export interface SessionMemberInfo {
  uid: string;
  displayName: string;
  role: 'host' | 'guest';
  ready: boolean;
  joinedAt: Date;
}

/**
 * Named participant data for session creation.
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
 * Individual game preference for sharing.
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
 * Result from getSharedPreferences.
 */
export interface SharedPreferencesResult {
  /** Whether shared preferences exist for this slot */
  hasPreferences: boolean;
  /** The preferences (empty if hasPreferences is false) */
  preferences: SharedGamePreference[];
  /** Display name from the shared preferences */
  displayName: string | null;
}

/**
 * Guest preferences data returned from getAllGuestPreferences.
 */
export interface GuestPreferencesData {
  uid: string;
  participantId: string;
  displayName: string;
  preferences: SharedGamePreference[];
  ready: boolean;
  updatedAt: string | null;
}
