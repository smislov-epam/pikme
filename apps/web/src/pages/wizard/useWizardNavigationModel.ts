import { useMemo } from 'react'
import { wizardSteps } from './wizardSteps'
import type { WizardActions, WizardState } from '../../hooks/useWizardState'

export function useWizardNavigationModel(args: {
  wizard: WizardState & WizardActions
  activeStep: number
  setActiveStep: (step: number | ((prev: number) => number)) => void
  completedSteps: boolean[]
  setCompletedSteps: (steps: boolean[] | ((prev: boolean[]) => boolean[])) => void
  sessionGuestMode: string | null
  hasGamesInSessionMode: boolean
  activeSessionId?: string | null
}) {
  const {
    wizard,
    activeStep,
    setActiveStep,
    completedSteps,
    setCompletedSteps,
    sessionGuestMode,
    hasGamesInSessionMode,
    activeSessionId = null,
  } = args

  const isSessionFrozen = Boolean(activeSessionId && !sessionGuestMode)

  const canProceed = useMemo(() => {
    switch (activeStep) {
      case 0:
        return wizard.users.length > 0 && wizard.games.length > 0
      case 1:
        return wizard.filteredGames.length > 0
      case 2:
        return true
      case 3:
        return wizard.recommendation.topPick !== null
      default:
        return false
    }
  }, [activeStep, wizard.users, wizard.games, wizard.filteredGames, wizard.recommendation])

  const canGoBack = hasGamesInSessionMode
    ? false
    : isSessionFrozen
      ? activeStep > 2
      : activeStep > 0

  const canGoNext = hasGamesInSessionMode
    ? false
    : isSessionFrozen
      ? activeStep === 2
      : activeStep < wizardSteps.length - 1 && canProceed
  const isLastStep = hasGamesInSessionMode ? activeStep === 2 : activeStep === wizardSteps.length - 1

  const markStepCompleted = (stepIndex: number) => {
    setCompletedSteps((prev) => {
      const next = [...prev]
      next[stepIndex] = true
      return next
    })
  }

  const onNext = () => {
    markStepCompleted(activeStep)
    setActiveStep((s) => Math.min(s + 1, wizardSteps.length - 1))
  }

  const onBack = () => setActiveStep((s) => Math.max(s - 1, 0))

  const onStartOver = async () => {
    wizard.reset()
    setActiveStep(0)
    setCompletedSteps(wizardSteps.map(() => false))
    await wizard.loadSavedNights()
  }

  const canJumpTo = (stepIndex: number) => {
    const hasGames = wizard.games.length > 0
    if (isSessionFrozen && hasGames && (stepIndex === 0 || stepIndex === 1)) {
      return false
    }
    if (sessionGuestMode && hasGames && (stepIndex === 0 || stepIndex === 1 || stepIndex === 3)) {
      return false
    }
    return stepIndex <= activeStep || completedSteps[stepIndex - 1]
  }

  const stepSubtitles = useMemo(() => {
    const sessionCount = wizard.sessionGameIds.length
    const eligibleCount = wizard.filteredGames.length
    const hasResult = wizard.recommendation.topPick !== null
    const alternativesCount = wizard.recommendation.alternatives.length

    const resultGamesCount = hasResult ? 1 + alternativesCount : 0

    return [
      `${sessionCount} game${sessionCount === 1 ? '' : 's'}`,
      `${eligibleCount} game${eligibleCount === 1 ? '' : 's'}`,
      `${eligibleCount} game${eligibleCount === 1 ? '' : 's'}`,
      `${resultGamesCount} game${resultGamesCount === 1 ? '' : 's'}`,
    ]
  }, [wizard.filteredGames.length, wizard.recommendation, wizard.sessionGameIds.length])

  const compactBadgeCount = useMemo(() => {
    const eligible = wizard.filteredGames.length
    const imported = wizard.games.length
    return eligible > 0 ? eligible : imported
  }, [wizard.filteredGames.length, wizard.games.length])

  return {
    canProceed,
    canGoBack,
    canGoNext,
    isLastStep,
    canJumpTo,
    stepSubtitles,
    compactBadgeCount,
    onNext,
    onBack,
    onStartOver,
  }
}
