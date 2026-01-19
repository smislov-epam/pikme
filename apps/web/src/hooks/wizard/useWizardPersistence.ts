/**
 * Hook for orchestrating wizard state persistence.
 * 
 * Single responsibility: Load/save wizard state from/to IndexedDB and localStorage.
 * Handles both global wizard state and per-session state isolation.
 */
import { useCallback, useEffect, useRef } from 'react'
import type { WizardFilters } from '../../store/wizardTypes'
import type { UserRecord, UserPreferenceRecord, GameRecord } from '../../db/types'
import {
  loadSessionWizardState,
  saveSessionWizardState,
  type SessionWizardState,
} from '../../services/storage/wizardStateStorage'
import * as dbService from '../../services/db'

export interface WizardPersistenceState {
  users: UserRecord[]
  games: GameRecord[]
  sessionGameIds: number[]
  excludedBggIds: number[]
  filters: WizardFilters
  preferences: Record<string, UserPreferenceRecord[]>
  activeStep: number
}

export interface UseWizardPersistenceOptions {
  /** Callback when session state is loaded */
  onSessionStateLoaded?: (state: WizardPersistenceState) => void
}

export interface UseWizardPersistenceResult {
  /** Save current wizard state to a session snapshot */
  saveToSession: (sessionId: string, state: WizardPersistenceState) => void
  /** Load wizard state from a session snapshot */
  loadFromSession: (sessionId: string) => Promise<WizardPersistenceState | null>
  /** Reset state for a new session (clears session-specific data) */
  getResetState: (keepGames: GameRecord[]) => Partial<WizardPersistenceState>
}

/**
 * Default empty/reset state for new sessions.
 */
export const DEFAULT_RESET_STATE: Omit<WizardPersistenceState, 'users' | 'games'> = {
  sessionGameIds: [],
  excludedBggIds: [],
  filters: {
    playerCount: 0,
    timeRange: { min: 0, max: 300 },
    mode: 'any',
    requireBestWithPlayerCount: false,
    excludeLowRatedThreshold: null,
    ageRange: { min: 0, max: 21 },
    complexityRange: { min: 1, max: 5 },
    ratingRange: { min: 0, max: 10 },
  },
  preferences: {},
  activeStep: 0,
}

export function useWizardPersistence(
  options: UseWizardPersistenceOptions = {}
): UseWizardPersistenceResult {
  const { onSessionStateLoaded } = options
  const onSessionStateLoadedRef = useRef(onSessionStateLoaded)

  useEffect(() => {
    onSessionStateLoadedRef.current = onSessionStateLoaded
  }, [onSessionStateLoaded])

  const saveToSession = useCallback((sessionId: string, state: WizardPersistenceState) => {
    const sessionState: SessionWizardState = {
      usernames: state.users.map((u) => u.username),
      sessionGameIds: state.sessionGameIds,
      excludedBggIds: state.excludedBggIds,
      filters: state.filters,
      preferences: Object.fromEntries(
        Object.entries(state.preferences).map(([username, prefs]) => [
          username,
          prefs.map((p) => ({
            bggId: p.bggId,
            rank: p.rank,
            isTopPick: p.isTopPick,
            isDisliked: p.isDisliked,
          })),
        ])
      ),
      activeStep: state.activeStep,
      savedAt: new Date().toISOString(),
    }
    void saveSessionWizardState(sessionId, sessionState)
  }, [])

  const loadFromSession = useCallback(async (sessionId: string): Promise<WizardPersistenceState | null> => {
    const savedState = await loadSessionWizardState(sessionId)
    if (!savedState) return null

    // Reconstruct full user records from usernames
    const users: UserRecord[] = []
    for (const username of savedState.usernames) {
      const user = await dbService.getUser(username)
      if (user) {
        users.push(user)
      }
    }

    // Reconstruct full preference records
    const now = new Date().toISOString()
    const preferences: Record<string, UserPreferenceRecord[]> = {}
    for (const [username, savedPrefs] of Object.entries(savedState.preferences)) {
      preferences[username] = savedPrefs.map((p) => ({
        username,
        bggId: p.bggId,
        rank: p.rank,
        isTopPick: p.isTopPick,
        isDisliked: p.isDisliked,
        updatedAt: now,
      }))
    }

    // Load games from DB (shared collection)
    const games = await dbService.getAllGames()

    const state: WizardPersistenceState = {
      users,
      games,
      sessionGameIds: savedState.sessionGameIds,
      excludedBggIds: savedState.excludedBggIds,
      filters: savedState.filters,
      preferences,
      activeStep: savedState.activeStep,
    }

    return state
  }, [])

  const getResetState = useCallback((keepGames: GameRecord[]): Partial<WizardPersistenceState> => {
    return {
      ...DEFAULT_RESET_STATE,
      games: keepGames,
    }
  }, [])

  return {
    saveToSession,
    loadFromSession,
    getResetState,
  }
}

// Auto-save effect hook for use in composed state
export function useAutoSaveSession(
  sessionId: string | null,
  state: WizardPersistenceState,
  saveToSession: (sessionId: string, state: WizardPersistenceState) => void,
  debounceMs: number = 1000
): void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!sessionId) return

    // Debounce saves
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      saveToSession(sessionId, state)
    }, debounceMs)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [sessionId, state, saveToSession, debounceMs])
}
