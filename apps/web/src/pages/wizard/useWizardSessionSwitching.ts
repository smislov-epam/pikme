import { useEffect, useRef } from 'react'
import type { WizardActions, WizardState } from '../../hooks/useWizardState'
import { buildSessionWizardStateSnapshot } from '../../services/storage/sessionWizardStateBuilder'
import {
  loadSessionWizardState,
  saveSessionWizardState,
} from '../../services/storage/wizardStateStorage'
import { getLocalOwner } from '../../services/db/localOwnerService'

export function useWizardSessionSwitching(opts: {
  activeSessionId: string | null
  lastLoadedSessionId: string | null
  setLastLoadedSessionId: (sessionId: string | null) => void
  sessionGuestMode: string | null
  wizard: WizardState & WizardActions
  activeStep: number
  setActiveStep: (step: number) => void
}) {
  const {
    activeSessionId,
    lastLoadedSessionId,
    setLastLoadedSessionId,
    sessionGuestMode,
    wizard,
    activeStep,
    setActiveStep,
  } = opts

  const loadRequestIdRef = useRef(0)

  useEffect(() => {
    if (!activeSessionId || activeSessionId === lastLoadedSessionId) return
    // When the app is in guest-mode (local join), we do not use the wizard session
    // snapshot switching. Guest flows are handled via the dedicated session page.
    if (sessionGuestMode) return

    const requestId = ++loadRequestIdRef.current
    const targetSessionId = activeSessionId

    if (lastLoadedSessionId && wizard.users.length > 0) {
      const currentState = buildSessionWizardStateSnapshot({
        users: wizard.users,
        sessionGameIds: wizard.sessionGameIds,
        excludedBggIds: wizard.excludedBggIds,
        filters: wizard.filters,
        preferences: wizard.preferences,
        activeStep,
      })
      void saveSessionWizardState(lastLoadedSessionId, currentState)
    }

    void (async () => {
        const savedState = await loadSessionWizardState(targetSessionId)

        // If another session switch started while we were loading, ignore.
        if (loadRequestIdRef.current !== requestId) return

        if (!savedState) {
          // No snapshot for this session yet. Reset session-scoped state but
          // ensure the local owner is still added so user can configure the session.
          wizard.resetForNewSession()
          
          // Add local owner since useEnsureLocalOwnerSelected skips when
          // there's an active session (to avoid race conditions)
          const owner = await getLocalOwner()
          if (owner) {
            await wizard.addLocalUser(owner.username)
          }
          
          setActiveStep(0)
          setLastLoadedSessionId(targetSessionId)
          return
        }

        await wizard.loadFromSessionState({
          usernames: savedState.usernames,
          sessionGameIds: savedState.sessionGameIds,
          excludedBggIds: savedState.excludedBggIds,
          filters: savedState.filters,
          preferences: savedState.preferences,
        })

        // If another session switch started while we were applying, ignore.
        if (loadRequestIdRef.current !== requestId) return

        // When switching sessions from the banner/list, always land on Preferences.
        setActiveStep(2)
        setLastLoadedSessionId(targetSessionId)
    })()
  }, [
    activeSessionId,
    lastLoadedSessionId,
    sessionGuestMode,
    wizard,
    activeStep,
    setActiveStep,
    setLastLoadedSessionId,
  ])
}
