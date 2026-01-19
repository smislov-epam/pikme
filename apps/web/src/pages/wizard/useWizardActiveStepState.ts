import { useCallback, useState } from 'react'
import { wizardSteps } from './wizardSteps'
import { getPersistedActiveStep, setPersistedActiveStep } from '../../services/storage/wizardStateStorage'

export function useWizardActiveStepState() {
  const [activeStep, setActiveStepState] = useState(() => getPersistedActiveStep())
  const [completedSteps, setCompletedSteps] = useState<boolean[]>(() => wizardSteps.map(() => false))

  const setActiveStep = useCallback((step: number | ((prev: number) => number)) => {
    setActiveStepState((prev) => {
      const newStep = typeof step === 'function' ? step(prev) : step
      setPersistedActiveStep(newStep)
      return newStep
    })
  }, [])

  return { activeStep, setActiveStep, completedSteps, setCompletedSteps }
}
