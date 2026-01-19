import { useEffect } from 'react'
import type { WizardActions, WizardState } from '../../hooks/useWizardState'
import { getLocalOwner } from '../../services/db/localOwnerService'
import { setWizardActiveSessionId } from '../../services/storage/wizardStateStorage'
import { wizardSteps } from './wizardSteps'

export function useWizardUrlParams(opts: {
  activeSessionId: string | null
  setActiveSessionId: (sessionId: string | null) => void
  setActiveStep: (step: number) => void
  setCompletedSteps: (steps: boolean[]) => void
  setForceCreateNewSession: (value: boolean) => void
  setShowSessionDialog: (value: boolean) => void
  setLastLoadedSessionId: (sessionId: string | null) => void
  wizard: WizardState & WizardActions
}) {
  const {
    activeSessionId,
    setActiveSessionId,
    setActiveStep,
    setCompletedSteps,
    setForceCreateNewSession,
    setShowSessionDialog,
    setLastLoadedSessionId,
    wizard,
  } = opts

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    const newSessionParam = params.get('newSession')
    if (newSessionParam === 'true') {
      wizard.resetForNewSession()
      setActiveStep(0)
      setCompletedSteps(wizardSteps.map(() => false))
      setActiveSessionId(null)
      setWizardActiveSessionId(null)
      setLastLoadedSessionId(null)

      void (async () => {
        try {
          const owner = await getLocalOwner()
          if (owner && wizard.users.length === 0) {
            await wizard.addLocalUser(owner.username)
          }
        } catch {
          // ignore
        }
      })()

      params.delete('newSession')
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname
      window.history.replaceState({}, '', newUrl)
      return
    }

    const sessionParam = params.get('session')
    if (sessionParam && sessionParam !== activeSessionId) {
      setActiveSessionId(sessionParam)
      setWizardActiveSessionId(sessionParam)

      params.delete('session')
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }

    const createSessionParam = params.get('createSession')
    if (createSessionParam === 'true') {
      setForceCreateNewSession(true)
      setShowSessionDialog(true)

      params.delete('createSession')
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [
    activeSessionId,
    setActiveSessionId,
    setActiveStep,
    setCompletedSteps,
    setForceCreateNewSession,
    setShowSessionDialog,
    setLastLoadedSessionId,
    wizard,
  ])
}
