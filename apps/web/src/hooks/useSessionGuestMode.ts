import { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect } from 'react'
import { useSessionGuests } from './useSessionGuests'
import { useAuth } from './useAuth'
import { getSessionPreview } from '../services/session'
import type { WizardState } from './useWizardState'

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
 * Clears session guest mode from localStorage.
 */
function clearSessionGuestModeStorage() {
  localStorage.removeItem('sessionGuestMode')
  localStorage.removeItem('activeSessionId')
}

interface UseSessionGuestModeOptions {
  wizard: WizardState
  activeStep: number
  setActiveStep: (step: number) => void
}

export interface SessionGuestModeResult {
  /** Session ID if in guest mode, null otherwise */
  sessionGuestMode: string | null
  /** Whether user has games while in session mode */
  hasGamesInSessionMode: boolean
  /** Exit session guest mode */
  handleExitSessionMode: () => void
  /** Merged users (wizard users + session guests) */
  mergedUsers: WizardState['users']
  /** Merged preferences (wizard preferences + guest preferences) */
  mergedPreferences: WizardState['preferences']
  /** Guest statuses for tabs */
  guestStatuses: Array<{ username: string; ready: boolean; updatedAt: number | null }>
  /** Guest users for save dialog */
  guestUsersForSave: Array<{ username: string; displayName: string }>
  /** Session guests from hook */
  sessionGuests: ReturnType<typeof useSessionGuests>['guests']
  /** Active session ID for host */
  activeSessionId: string | null
  /** Set active session ID */
  setActiveSessionId: (id: string | null) => void
  /** Whether user can create sessions */
  canCreateSession: boolean
  /** Locked steps in session guest mode */
  lockedSteps: number[]
}

export function useSessionGuestMode({
  wizard,
  activeStep,
  setActiveStep,
}: UseSessionGuestModeOptions): SessionGuestModeResult {
  const [sessionGuestMode, setSessionGuestMode] = useState<string | null>(() =>
    getSessionGuestModeFromStorage()
  )
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [namedSlotParticipantIds, setNamedSlotParticipantIds] = useState<string[]>([])
  const hasJumpedToPrefsRef = useRef(false)

  const { user, firebaseReady } = useAuth()
  const { guests: sessionGuests } = useSessionGuests(activeSessionId)

  // Jump to Preferences step when in session guest mode with games
  useLayoutEffect(() => {
    if (hasJumpedToPrefsRef.current) return
    if (sessionGuestMode && wizard.games.length > 0 && activeStep < 2) {
      hasJumpedToPrefsRef.current = true
      setActiveStep(2)
    }
  }, [sessionGuestMode, wizard.games.length, activeStep, setActiveStep])

  // Handler to exit session guest mode
  const handleExitSessionMode = useCallback(() => {
    clearSessionGuestModeStorage()
    setSessionGuestMode(null)
    setActiveStep(0)
  }, [setActiveStep])

  // Load named slot participant IDs
  useEffect(() => {
    let cancelled = false

    async function loadNamedSlots() {
      if (!activeSessionId || !firebaseReady) {
        setNamedSlotParticipantIds([])
        return
      }

      try {
        const preview = await getSessionPreview(activeSessionId)
        if (cancelled) return
        setNamedSlotParticipantIds((preview.namedSlots ?? []).map((s) => s.participantId))
      } catch {
        if (cancelled) return
        setNamedSlotParticipantIds([])
      }
    }

    loadNamedSlots()
    return () => {
      cancelled = true
    }
  }, [activeSessionId, firebaseReady])

  const namedSlotIdSet = useMemo(() => new Set(namedSlotParticipantIds), [namedSlotParticipantIds])

  const resolveNamedSlotUsername = useCallback(
    (guest: (typeof sessionGuests)[number]): string | null => {
      if (!namedSlotIdSet.has(guest.participantId)) return null
      const guestName = (guest.user.displayName || '').trim().toLowerCase()
      if (!guestName) return null

      const matches = wizard.users.filter((u) => {
        const n = (u.displayName || u.username || '').trim().toLowerCase()
        return n === guestName
      })

      if (matches.length !== 1) return null
      return matches[0]!.username
    },
    [namedSlotIdSet, wizard.users]
  )

  // Merge session guests into wizard users
  const mergedUsers = useMemo(() => {
    if (!activeSessionId || sessionGuests.length === 0) return wizard.users

    const byUsername = new Map(wizard.users.map((u) => [u.username, u]))
    for (const guest of sessionGuests) {
      const namedUsername = resolveNamedSlotUsername(guest)
      if (namedUsername) continue

      if (!byUsername.has(guest.user.username)) byUsername.set(guest.user.username, guest.user)
    }

    return Array.from(byUsername.values())
  }, [wizard.users, activeSessionId, sessionGuests, resolveNamedSlotUsername])

  // Guest users for save dialog
  const guestUsersForSave = useMemo(() => {
    return mergedUsers
      .filter((u) => u.username.startsWith('__guest_'))
      .map((u) => ({
        username: u.username,
        displayName: u.displayName || u.username,
      }))
  }, [mergedUsers])

  // Merge preferences
  const mergedPreferences = useMemo(() => {
    if (!activeSessionId || sessionGuests.length === 0) return wizard.preferences

    const merged = { ...wizard.preferences }

    for (const guest of sessionGuests) {
      const namedUsername = resolveNamedSlotUsername(guest)
      if (namedUsername) {
        merged[namedUsername] = guest.preferences.map((p) => ({ ...p, username: namedUsername }))
      } else {
        merged[guest.user.username] = guest.preferences
      }
    }

    return merged
  }, [wizard.preferences, activeSessionId, sessionGuests, resolveNamedSlotUsername])

  // Guest statuses for tabs
  const guestStatuses = useMemo(() => {
    if (!activeSessionId || sessionGuests.length === 0) return []

    return sessionGuests.map((g) => ({
      username: resolveNamedSlotUsername(g) ?? g.user.username,
      ready: g.ready,
      updatedAt:
        g.updatedAt?.getTime() ??
        (g.preferences.length > 0 ? new Date(g.preferences[0].updatedAt).getTime() : null),
    }))
  }, [activeSessionId, sessionGuests, resolveNamedSlotUsername])

  // Whether user can create sessions
  const canCreateSession =
    firebaseReady && user !== null && wizard.games.length > 0 && activeStep >= 2

  // Session guest mode restrictions
  const hasGamesInSessionMode = Boolean(sessionGuestMode && wizard.games.length > 0)

  // Locked steps in session guest mode
  const lockedSteps = useMemo(() => {
    if (!sessionGuestMode) return []
    if (wizard.games.length === 0) return []
    return [0, 1, 3] // Players, Filters, Result
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
  }
}
