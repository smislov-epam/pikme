import { useEffect } from 'react'
import type { WizardActions, WizardState } from '../../hooks/useWizardState'
import type { ToastApi } from '../../services/toast'
import { trackWizardStepView } from '../../services/analytics/googleAnalytics'
import { wizardSteps } from './wizardSteps'

export function useWizardPageEffects(args: {
  wizard: WizardState & WizardActions
  toast: ToastApi
  activeStep: number
  setActiveStep: (step: number | ((prev: number) => number)) => void
  sessionGuestMode: string | null
  activeSessionId: string | null
}) {
  const { wizard, toast, activeStep, setActiveStep, sessionGuestMode, activeSessionId } = args

  useEffect(() => {
    if (!sessionGuestMode) return
    if (activeStep < 2) {
      setActiveStep(2)
    }
  }, [sessionGuestMode, activeStep, setActiveStep])

  useEffect(() => {
    if (sessionGuestMode) return
    if (!activeSessionId) return
    if (activeStep < 2) {
      setActiveStep(2)
    }
  }, [sessionGuestMode, activeSessionId, activeStep, setActiveStep])

  const userError = wizard.userError
  const clearUserError = wizard.clearUserError
  useEffect(() => {
    if (!userError) return
    toast.error(userError)
    clearUserError()
  }, [toast, userError, clearUserError])

  const usersLen = wizard.users.length
  const sessionGamesLen = wizard.sessionGameIds.length
  const filteredLen = wizard.filteredGames.length
  useEffect(() => {
    const stepName = wizardSteps[activeStep] ?? `Step ${activeStep + 1}`
    trackWizardStepView(stepName, {
      stepIndex: activeStep,
      playerCount: usersLen,
      sessionGames: sessionGamesLen,
      filteredGames: filteredLen,
    })
  }, [activeStep, usersLen, sessionGamesLen, filteredLen])
}
