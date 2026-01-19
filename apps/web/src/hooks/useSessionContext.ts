/**
 * useSessionContext (REQ-108)
 *
 * Centralized session context management hook.
 * Provides single source of truth for session-related state across the app.
 * 
 * Consolidates:
 * - activeSessionId (current focused session)
 * - activeSessionIds (multi-session list)
 * - sessionGuestMode (guest joined with local games)
 * - Session validation on mount
 * - Atomic cleanup functions
 */

import { useCallback, useEffect, useState } from 'react'
import { clearAllSessionStorage } from '../services/storage/wizardStateStorage'
import { getSessionPreview } from '../services/session'
import { useAuth } from './useAuth'

const ACTIVE_SESSION_KEY = 'activeSessionId'
const ACTIVE_SESSIONS_KEY = 'activeSessionIds'
const SESSION_GUEST_MODE_KEY = 'sessionGuestMode'

export interface SessionContextState {
  /** Currently focused session ID */
  activeSessionId: string | null
  /** All active session IDs (for multi-session support) */
  activeSessionIds: string[]
  /** Session ID if in guest mode with local games */
  sessionGuestMode: string | null
  /** Whether session context has been validated after mount */
  isValidated: boolean
  /** Whether validation is in progress */
  isValidating: boolean
}

export interface SessionContextActions {
  /** Set the active/focused session */
  setActiveSessionId: (sessionId: string | null) => void
  /** Add a session to active list */
  addSession: (sessionId: string) => void
  /** Remove a session from active list */
  removeSession: (sessionId: string) => void
  /** Set session guest mode */
  setSessionGuestMode: (sessionId: string | null) => void
  /** Clear all session context atomically */
  clearAllSessions: () => void
  /** Validate that active sessions still exist */
  validateSessions: () => Promise<void>
}

export type UseSessionContextResult = SessionContextState & SessionContextActions

/**
 * Get stored session IDs from localStorage.
 */
function getStoredSessionIds(): string[] {
  try {
    const stored = localStorage.getItem(ACTIVE_SESSIONS_KEY)
    if (!stored) {
      // Backward compat: check for single session
      const single = localStorage.getItem(ACTIVE_SESSION_KEY)
      return single ? [single] : []
    }
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

/**
 * Store session IDs to localStorage.
 */
function storeSessionIds(ids: string[]): void {
  if (ids.length === 0) {
    localStorage.removeItem(ACTIVE_SESSIONS_KEY)
  } else {
    localStorage.setItem(ACTIVE_SESSIONS_KEY, JSON.stringify(ids))
  }
}

export function useSessionContext(): UseSessionContextResult {
  const { firebaseReady } = useAuth()
  
  // Initialize state from localStorage
  const [activeSessionId, setActiveSessionIdState] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_SESSION_KEY)
  )
  const [activeSessionIds, setActiveSessionIds] = useState<string[]>(
    () => getStoredSessionIds()
  )
  const [sessionGuestMode, setSessionGuestModeState] = useState<string | null>(() => {
    const mode = localStorage.getItem(SESSION_GUEST_MODE_KEY)
    const sessionId = localStorage.getItem(ACTIVE_SESSION_KEY)
    return mode === 'local' && sessionId ? sessionId : null
  })
  const [isValidated, setIsValidated] = useState(false)
  const [isValidating, setIsValidating] = useState(false)

  // Sync activeSessionId to localStorage
  const setActiveSessionId = useCallback((sessionId: string | null) => {
    setActiveSessionIdState(sessionId)
    if (sessionId) {
      localStorage.setItem(ACTIVE_SESSION_KEY, sessionId)
    } else {
      localStorage.removeItem(ACTIVE_SESSION_KEY)
    }
  }, [])

  // Sync sessionGuestMode to localStorage
  const setSessionGuestMode = useCallback((sessionId: string | null) => {
    setSessionGuestModeState(sessionId)
    if (sessionId) {
      localStorage.setItem(SESSION_GUEST_MODE_KEY, 'local')
    } else {
      localStorage.removeItem(SESSION_GUEST_MODE_KEY)
    }
  }, [])

  // Add session to list
  const addSession = useCallback((sessionId: string) => {
    setActiveSessionIds((prev) => {
      if (prev.includes(sessionId)) return prev
      const updated = [...prev, sessionId]
      storeSessionIds(updated)
      return updated
    })
    // Also set as active if not already set
    setActiveSessionId(sessionId)
  }, [setActiveSessionId])

  // Remove session from list
  const removeSession = useCallback((sessionId: string) => {
    setActiveSessionIds((prev) => {
      const updated = prev.filter((id) => id !== sessionId)
      storeSessionIds(updated)
      return updated
    })
    
    // If removing active session, switch to another or clear
    if (activeSessionId === sessionId) {
      const remaining = activeSessionIds.filter((id) => id !== sessionId)
      setActiveSessionId(remaining[0] ?? null)
    }
    
    // Clear session guest mode if it matches
    if (sessionGuestMode === sessionId) {
      setSessionGuestMode(null)
    }
  }, [activeSessionId, activeSessionIds, sessionGuestMode, setActiveSessionId, setSessionGuestMode])

  // Clear all session context atomically
  const clearAllSessions = useCallback(() => {
    clearAllSessionStorage()
    setActiveSessionIdState(null)
    setActiveSessionIds([])
    setSessionGuestModeState(null)
    setIsValidated(false)
  }, [])

  // Validate that sessions still exist/are open
  const validateSessions = useCallback(async () => {
    if (!firebaseReady || activeSessionIds.length === 0) {
      setIsValidated(true)
      return
    }

    setIsValidating(true)
    try {
      const validIds: string[] = []
      
      for (const sessionId of activeSessionIds) {
        try {
          const preview = await getSessionPreview(sessionId)
          if (preview.status === 'open') {
            validIds.push(sessionId)
          } else {
            console.log(`[useSessionContext] Session ${sessionId} is ${preview.status}, removing`)
          }
        } catch (err) {
          console.warn(`[useSessionContext] Session ${sessionId} not found, removing:`, err)
        }
      }

      // Update to only valid sessions
      if (validIds.length !== activeSessionIds.length) {
        setActiveSessionIds(validIds)
        storeSessionIds(validIds)
        
        // Update active session if it was removed
        if (activeSessionId && !validIds.includes(activeSessionId)) {
          setActiveSessionId(validIds[0] ?? null)
        }
        
        // Clear guest mode if session was removed
        if (sessionGuestMode && !validIds.includes(sessionGuestMode)) {
          setSessionGuestMode(null)
        }
      }
    } catch (err) {
      console.error('[useSessionContext] Failed to validate sessions:', err)
    } finally {
      setIsValidating(false)
      setIsValidated(true)
    }
  }, [firebaseReady, activeSessionIds, activeSessionId, sessionGuestMode, setActiveSessionId, setSessionGuestMode])

  // Validate sessions on mount and when Firebase becomes ready
  useEffect(() => {
    if (firebaseReady && !isValidated && !isValidating) {
      validateSessions()
    }
  }, [firebaseReady, isValidated, isValidating, validateSessions])

  return {
    // State
    activeSessionId,
    activeSessionIds,
    sessionGuestMode,
    isValidated,
    isValidating,
    // Actions
    setActiveSessionId,
    addSession,
    removeSession,
    setSessionGuestMode,
    clearAllSessions,
    validateSessions,
  }
}
