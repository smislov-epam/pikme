/**
 * Types for the Preferences step components
 */

/** Status of a guest participant (for host view) */
export interface GuestStatus {
  username: string
  ready: boolean
  /** When guest preferences were last updated (ms since epoch). Null/undefined means no updates yet. */
  updatedAt?: number | null
}

/** Sync state for a local user's preferences in an active session */
export type UserSyncState = 
  | 'needs-sync'     // Local changes not synced yet (blue sync arrows - click to sync)
  | 'syncing'        // Currently syncing (rotating sync icon, not clickable)
  | 'synced'         // Local user preferences synced (green checkmark)
  | 'remote'         // Remote guest preferences received (green cloud with checkmark)
  | 'waiting'        // Waiting for remote guest (empty circle)

/** Sync status for a user in the session */
export interface UserSyncStatus {
  username: string
  state: UserSyncState
  /** Timestamp of last sync (used to detect changes since sync) */
  lastSyncedAt?: number | null
  /** Snapshot of preferences when last synced (stringified for comparison) */
  lastSyncedPrefsHash?: string | null
}
