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
