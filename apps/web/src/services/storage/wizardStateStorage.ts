import { db } from '../../db'
import type { SessionWizardStateRecord, WizardStateRecord } from '../../db/types'

export async function loadWizardState<T>(): Promise<T | null> {
  const record = await db.wizardState.get('singleton')
  return (record?.data as T | undefined) ?? null
}

export async function saveWizardState<T>(data: T): Promise<void> {
  const record: WizardStateRecord = {
    id: 'singleton',
    data,
    updatedAt: new Date().toISOString(),
  }

  await db.wizardState.put(record)
}

export async function clearWizardState(): Promise<void> {
  await db.wizardState.delete('singleton')
}

// ─────────────────────────────────────────────────────────────────────────────
// Session Context Storage (localStorage) - REQ-108
// ─────────────────────────────────────────────────────────────────────────────

const SESSION_STORAGE_KEYS = {
  activeSessionId: 'activeSessionId',
  // Wizard host context (separate from the global "current session" selection)
  wizardActiveSessionId: 'wizardActiveSessionId',
  activeSessionIds: 'activeSessionIds',
  sessionGuestMode: 'sessionGuestMode',
  guestSessionId: 'guestSessionId',
  guestDisplayName: 'guestDisplayName',
  guestParticipantId: 'guestParticipantId',
  guestClaimedNamedSlot: 'guestClaimedNamedSlot',
  guestShareMode: 'guestShareMode',
  guestMode: 'guestMode',
  guestPreferenceSource: 'guestPreferenceSource',
  guestSessionGameIds: 'guestSessionGameIds',
  guestIsReady: 'guestIsReady',
} as const

export function getWizardActiveSessionId(): string | null {
  return localStorage.getItem(SESSION_STORAGE_KEYS.wizardActiveSessionId)
}

export function setWizardActiveSessionId(sessionId: string | null): void {
  if (sessionId) {
    localStorage.setItem(SESSION_STORAGE_KEYS.wizardActiveSessionId, sessionId)
  } else {
    localStorage.removeItem(SESSION_STORAGE_KEYS.wizardActiveSessionId)
  }
}

/**
 * Clear all session-related localStorage keys atomically.
 * Used when exiting sessions or when detecting stale session state.
 */
export function clearAllSessionStorage(): void {
  Object.values(SESSION_STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key)
  })
  // Also clear sessionStorage items
  sessionStorage.removeItem('guestInitialPreferences')
  sessionStorage.removeItem('guestSessionGameIds')
}

/**
 * Clear session context for a specific session.
 * Only clears if the stored session matches the provided sessionId.
 */
export function clearSessionStorageForSession(sessionId: string): void {
  const storedActiveId = localStorage.getItem(SESSION_STORAGE_KEYS.activeSessionId)
  const storedGuestId = localStorage.getItem(SESSION_STORAGE_KEYS.guestSessionId)
  
  if (storedActiveId === sessionId || storedGuestId === sessionId) {
    clearAllSessionStorage()
  }
}

/**
 * Get persisted active step from localStorage.
 * Falls back to 0 if not found.
 */
export function getPersistedActiveStep(): number {
  const stored = localStorage.getItem('wizardActiveStep')
  if (stored) {
    const parsed = parseInt(stored, 10)
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 3) {
      return parsed
    }
  }
  return 0
}

/**
 * Persist active step to localStorage.
 */
export function setPersistedActiveStep(step: number): void {
  localStorage.setItem('wizardActiveStep', String(step))
}

/**
 * Clear persisted active step.
 */
export function clearPersistedActiveStep(): void {
  localStorage.removeItem('wizardActiveStep')
}

// ─────────────────────────────────────────────────────────────────────────────
// Session-Specific Wizard State Storage (REQ-108)
// Stores wizard state (users, filters, preferences) per-session to enable
// proper isolation when switching between sessions.
// ─────────────────────────────────────────────────────────────────────────────

const SESSION_STATE_PREFIX = 'sessionWizardState_'

let didMigrateSessionWizardState = false

async function migrateSessionWizardStateFromLocalStorage(): Promise<void> {
  if (didMigrateSessionWizardState) return
  didMigrateSessionWizardState = true

  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(SESSION_STATE_PREFIX)) {
      keys.push(key)
    }
  }

  if (keys.length === 0) return

  for (const key of keys) {
    const sessionId = key.substring(SESSION_STATE_PREFIX.length)
    const stored = localStorage.getItem(key)
    if (!stored) continue
    try {
      const parsed = JSON.parse(stored) as SessionWizardState
      const record: SessionWizardStateRecord = {
        id: sessionId,
        data: parsed,
        updatedAt: parsed.savedAt ?? new Date().toISOString(),
      }
      await db.sessionWizardState.put(record)
      localStorage.removeItem(key)
    } catch {
      // Ignore malformed entries
    }
  }
}

/**
 * Minimal wizard state that varies per-session.
 * Excludes games collection (shared across sessions).
 */
export interface SessionWizardState {
  /** Local users selected for this session */
  usernames: string[]
  /** Games included in this session */
  sessionGameIds: number[]
  /** Games excluded from this session */
  excludedBggIds: number[]
  /** Filter settings for this session */
  filters: {
    playerCount: number
    timeRange: { min: number; max: number }
    mode: 'coop' | 'competitive' | 'any'
    requireBestWithPlayerCount: boolean
    excludeLowRatedThreshold: number | null
    ageRange: { min: number; max: number }
    complexityRange: { min: number; max: number }
    ratingRange: { min: number; max: number }
  }
  /** User preferences for this session */
  preferences: Record<string, Array<{
    bggId: number
    rank?: number
    isTopPick: boolean
    isDisliked: boolean
  }>>
  /** Active wizard step */
  activeStep: number
  /** Timestamp when state was saved */
  savedAt: string
}

export function normalizeSessionWizardState(state: SessionWizardState): SessionWizardState {
  // Backwards-compatibility: older snapshots stored `rank: 0` to represent
  // "no rank". Ranks are 1-based in the UI, so treat any `rank <= 0` as undefined.
  return {
    ...state,
    preferences: Object.fromEntries(
      Object.entries(state.preferences).map(([username, prefs]) => [
        username,
        prefs.map((p) => ({
          ...p,
          rank: p.rank !== undefined && p.rank <= 0 ? undefined : p.rank,
        })),
      ]),
    ),
  }
}

/**
 * Save wizard state for a specific session.
 */
export async function saveSessionWizardState(sessionId: string, state: SessionWizardState): Promise<void> {
  await migrateSessionWizardStateFromLocalStorage()
  const record: SessionWizardStateRecord = {
    id: sessionId,
    data: state,
    updatedAt: state.savedAt ?? new Date().toISOString(),
  }
  await db.sessionWizardState.put(record)
}

/**
 * Load wizard state for a specific session.
 * Returns null if no state exists.
 */
export async function loadSessionWizardState(sessionId: string): Promise<SessionWizardState | null> {
  await migrateSessionWizardStateFromLocalStorage()
  const record = await db.sessionWizardState.get(sessionId)
  const state = (record?.data as SessionWizardState | undefined) ?? null
  return state ? normalizeSessionWizardState(state) : null
}

/**
 * Clear wizard state for a specific session.
 */
export async function clearSessionWizardState(sessionId: string): Promise<void> {
  await migrateSessionWizardStateFromLocalStorage()
  await db.sessionWizardState.delete(sessionId)
}

/**
 * Get all stored session IDs that have wizard state.
 */
export async function getSessionsWithWizardState(): Promise<string[]> {
  await migrateSessionWizardStateFromLocalStorage()
  return db.sessionWizardState.toCollection().primaryKeys()
}
