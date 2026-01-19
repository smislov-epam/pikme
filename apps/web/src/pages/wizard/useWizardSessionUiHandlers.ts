import { useCallback } from 'react'
import { useActiveSessions } from '../../hooks/useActiveSessions'
import type { WizardActions, WizardState } from '../../hooks/useWizardState'
import { buildSessionWizardStateSnapshot } from '../../services/storage/sessionWizardStateBuilder'
import { saveSessionWizardState, setWizardActiveSessionId, type SessionWizardState } from '../../services/storage/wizardStateStorage'

type SessionGuestModeState = {
  sessionGuestMode: string | null
  activeSessionId: string | null
  setActiveSessionId: (sessionId: string | null) => void
  handleExitSessionMode: () => void
}

type DialogSetters = {
  setShowSessionDialog: (open: boolean) => void
  setShowSessionInviteDialog: (open: boolean) => void
  setForceCreateNewSession: (forced: boolean) => void
}

export function useWizardSessionUiHandlers(args: {
  wizard: WizardState & WizardActions
  activeStep: number
  setActiveStep: (step: number) => void
  session: SessionGuestModeState
  dialogs: DialogSetters
  setLastLoadedSessionId: (sessionId: string | null) => void
  lastLoadedSessionId: string | null
}) {
  const { wizard, activeStep, setActiveStep, session, dialogs, setLastLoadedSessionId, lastLoadedSessionId } = args

  const activeSessionsState = useActiveSessions()

  const handleNavigateToSession = useCallback(
    (sessionId: string) => {
      // Save current state to the session we're leaving BEFORE switching.
      // This ensures any edits made are persisted.
      const previousSessionId = lastLoadedSessionId ?? session.activeSessionId
      if (previousSessionId && previousSessionId !== sessionId && wizard.users.length > 0) {
        const currentState: SessionWizardState = buildSessionWizardStateSnapshot({
          users: wizard.users,
          sessionGameIds: wizard.sessionGameIds,
          excludedBggIds: wizard.excludedBggIds,
          filters: wizard.filters,
          preferences: wizard.preferences,
          activeStep,
        })
        void saveSessionWizardState(previousSessionId, currentState)
      }

      activeSessionsState.setCurrentSession(sessionId)
      setWizardActiveSessionId(sessionId)

      if (session.sessionGuestMode === sessionId) return
      session.setActiveSessionId(sessionId)
      // When navigating between sessions, always land on Preferences.
      // Players/Filters are locked for session guest mode.
      if (session.sessionGuestMode) {
        setActiveStep(2)
      }
    },
    [activeSessionsState, activeStep, lastLoadedSessionId, session, setActiveStep, wizard]
  )

  const handleExitActiveSession = useCallback(
    (sessionId: string) => {
      activeSessionsState.removeSession(sessionId)
      if (sessionId === session.activeSessionId) {
        session.handleExitSessionMode()
      }
    },
    [activeSessionsState, session]
  )

  const handleSessionCreated = useCallback(
    (sessionId: string) => {
      const sessionState: SessionWizardState = buildSessionWizardStateSnapshot({
        users: wizard.users,
        sessionGameIds: wizard.sessionGameIds,
        excludedBggIds: wizard.excludedBggIds,
        filters: wizard.filters,
        preferences: wizard.preferences,
        activeStep,
      })

      // If there's an existing session, save current state to it FIRST
      // before switching to the new session. This ensures edits made while
      // on the old session are persisted to its snapshot.
      const previousSessionId = lastLoadedSessionId ?? session.activeSessionId
      if (previousSessionId && previousSessionId !== sessionId && wizard.users.length > 0) {
        void saveSessionWizardState(previousSessionId, sessionState)
      }

      // Also save to the new session (it inherits the current configuration)
      void saveSessionWizardState(sessionId, sessionState)

      console.debug('[handleSessionCreated] Setting activeSessionId:', sessionId)
      setLastLoadedSessionId(sessionId)
      session.setActiveSessionId(sessionId)
      setWizardActiveSessionId(sessionId)
      activeSessionsState.addSession(sessionId)
      setActiveStep(2)
    },
    [activeStep, activeSessionsState, lastLoadedSessionId, session, setActiveStep, setLastLoadedSessionId, wizard]
  )

  const onShareClick = useCallback(() => {
    if (session.activeSessionId) {
      dialogs.setShowSessionInviteDialog(true)
    } else {
      dialogs.setForceCreateNewSession(true)
      dialogs.setShowSessionDialog(true)
    }
  }, [dialogs, session.activeSessionId])

  return { activeSessionsState, handleNavigateToSession, handleExitActiveSession, handleSessionCreated, onShareClick }
}
