import { useEffect, useState, useMemo, useCallback } from 'react'
import { useSessionGuests } from './useSessionGuests'
import { useAuth } from './useAuth'
import { clearAllSessionStorage, getWizardActiveSessionId, setWizardActiveSessionId } from '../services/storage/wizardStateStorage'
import {
  computeHiddenLocalUsernames,
  mergeUsersWithNamedSlotDedupe,
  mergePreferencesWithNamedSlotDedupe,
} from './session/namedSlotDedupe'
import type { SessionGuestModeResult, UseSessionGuestModeOptions } from './session/sessionGuestModeTypes'

/**
 * Checks if wizard is in session guest mode (joined session using local games).
 * Returns sessionId if in guest mode, null otherwise.
 */
function getSessionGuestModeFromStorage(): string | null {
  const mode = localStorage.getItem('sessionGuestMode')
  const sessionId = localStorage.getItem('activeSessionId')
  if (mode === 'local' && sessionId) {
    return sessionId
  }
  return null
}

/**
 * Gets the active session ID from localStorage (for hosts who created sessions).
 */
function getActiveSessionIdFromStorage(): string | null {
  return getWizardActiveSessionId()
}

export function useSessionGuestMode({
  wizard,
  activeStep,
  setActiveStep,
}: UseSessionGuestModeOptions): SessionGuestModeResult {
  const [sessionGuestMode, setSessionGuestMode] = useState<string | null>(() =>
    getSessionGuestModeFromStorage()
  )

  // Initialize wizard-host active session id from wizard storage.
  // In guest mode, we still need an effective session id for listeners/actions,
  // so we fall back to sessionGuestMode.
  const [activeSessionId, setActiveSessionIdState] = useState<string | null>(() =>
    getActiveSessionIdFromStorage() ?? getSessionGuestModeFromStorage()
  )

  const { user, firebaseReady } = useAuth()
  const { guests: sessionGuests, error: sessionError } = useSessionGuests(activeSessionId)

  // Clear active session if permission error (user doesn't own the session)
  useEffect(() => {
    if (!sessionError) return
    if (sessionError.includes('permission') || sessionError.includes('Permission')) {
      console.warn('[useSessionGuestMode] Permission denied for session, clearing activeSessionId')
      // Schedule state update to avoid lint warning about setState in effect
      queueMicrotask(() => {
        setActiveSessionIdState(null)
        setWizardActiveSessionId(null)
      })
    }
  }, [sessionError])

  // Debug: Track activeSessionId and guest count
  useEffect(() => {
    console.debug('[useSessionGuestMode] activeSessionId:', activeSessionId, 'guests:', sessionGuests.length)
  }, [activeSessionId, sessionGuests])

  // If the user is authenticated, we are in host (or signed-in) context.
  // Clear any stale local-join guest-mode state so it doesn't lock preferences.
  useEffect(() => {
    if (!firebaseReady || !user) return

    const mode = localStorage.getItem('sessionGuestMode')
    if (mode !== 'local') return

    // Remove only guest-join keys; do NOT clear wizardActiveSessionId.
    localStorage.removeItem('sessionGuestMode')
    localStorage.removeItem('guestMode')
    localStorage.removeItem('activeSessionId')
    localStorage.removeItem('guestSessionId')
    localStorage.removeItem('guestDisplayName')
    localStorage.removeItem('guestParticipantId')
    localStorage.removeItem('guestClaimedNamedSlot')
    localStorage.removeItem('guestShareMode')
    localStorage.removeItem('guestPreferenceSource')
    localStorage.removeItem('guestSessionGameIds')
    localStorage.removeItem('guestIsReady')
    sessionStorage.removeItem('guestInitialPreferences')
    sessionStorage.removeItem('guestSessionGameIds')

    // Avoid synchronous setState in an effect body; schedule after storage cleanup.
    queueMicrotask(() => {
      setSessionGuestMode(null)
      // If activeSessionId was sourced from guest mode, reset it to wizard host context.
      setActiveSessionIdState(getActiveSessionIdFromStorage())
    })
  }, [firebaseReady, user])

  // Wrapper to also persist to localStorage when setting activeSessionId
  const setActiveSessionId = useCallback((sessionId: string | null) => {
    setActiveSessionIdState(sessionId)
    setWizardActiveSessionId(sessionId)
  }, [])

  // NOTE: Step jumping logic removed in REQ-106.
  // Returning users who select "Use My Preferences" are now redirected to
  // /session/:id/preferences (SessionGuestPage) instead of the wizard.
  // The sessionGuestMode flag is only used for host-side merged preferences display.

  // REQ-108: Handler to exit session guest mode - use centralized cleanup
  const handleExitSessionMode = useCallback(() => {
    clearAllSessionStorage()
    setSessionGuestMode(null)
    setActiveStep(0)
  }, [setActiveStep])

  // NOTE: We avoid fuzzy name matching.
  // However, when a remote guest claims a reserved named slot (participantId starts with "named-"),
  // we hide the corresponding local placeholder user *only if* there is an exact normalized
  // displayName match. This prevents the host from seeing the participant twice.

  const hiddenLocalUsernames = useMemo(() => {
    if (!activeSessionId || sessionGuests.length === 0) return new Set<string>()
    return computeHiddenLocalUsernames({
      wizardUsers: wizard.users,
      sessionGuests,
    })
  }, [wizard.users, activeSessionId, sessionGuests])

  // Merge session guests into wizard users (with named-slot dedupe)
  const mergedUsers = useMemo(() => {
    if (!activeSessionId || sessionGuests.length === 0) return wizard.users

    return mergeUsersWithNamedSlotDedupe({
      wizardUsers: wizard.users,
      sessionGuests,
      hiddenLocalUsernames,
    })
  }, [wizard.users, activeSessionId, sessionGuests, hiddenLocalUsernames])

  // Guest users for save dialog
  const guestUsersForSave = useMemo(() => {
    return mergedUsers
      .filter((u) => u.username.startsWith('__guest_'))
      .map((u) => ({
        username: u.username,
        displayName: u.displayName || u.username,
      }))
  }, [mergedUsers])

  // Merge preferences (guests as separate users, with named-slot preference handoff)
  const mergedPreferences = useMemo(() => {
    if (!activeSessionId || sessionGuests.length === 0) return wizard.preferences

    return mergePreferencesWithNamedSlotDedupe({
      wizardUsers: wizard.users,
      wizardPreferences: wizard.preferences,
      sessionGuests,
      hiddenLocalUsernames,
    })
  }, [wizard.preferences, wizard.users, activeSessionId, sessionGuests, hiddenLocalUsernames])

  // Guest statuses for tabs
  const guestStatuses = useMemo(() => {
    if (!activeSessionId || sessionGuests.length === 0) return []

    return sessionGuests.map((g) => ({
      username: g.user.username, // Always use guest's username directly
      ready: g.ready,
      updatedAt:
        g.updatedAt?.getTime() ??
        (g.preferences.length > 0 ? new Date(g.preferences[0].updatedAt).getTime() : null),
    }))
  }, [activeSessionId, sessionGuests])

  // Whether user can create sessions
  const canCreateSession =
    firebaseReady && user !== null && wizard.games.length > 0 && activeStep >= 2

  // Session guest mode restrictions
  const hasGamesInSessionMode = Boolean(sessionGuestMode && wizard.games.length > 0)

  // Locked steps in session guest mode (cannot navigate to these steps)
  const lockedSteps = useMemo(() => {
    if (!sessionGuestMode) return []
    if (wizard.games.length === 0) return []
    // Players and Filters are defined by the session and locked.
    return [0, 1]
  }, [sessionGuestMode, wizard.games.length])

  // Disabled steps - can view but controls are disabled
  const disabledSteps = useMemo(() => {
    if (!sessionGuestMode) return []
    if (wizard.games.length === 0) return []
    return []
  }, [sessionGuestMode, wizard.games.length])

  return {
    sessionGuestMode,
    hasGamesInSessionMode,
    handleExitSessionMode,
    mergedUsers,
    mergedPreferences,
    guestStatuses,
    guestUsersForSave,
    sessionGuests,
    activeSessionId,
    setActiveSessionId,
    canCreateSession,
    lockedSteps,
    disabledSteps,
  }
}
