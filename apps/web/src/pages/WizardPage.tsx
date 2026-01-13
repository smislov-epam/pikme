import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Container,
  alpha,
} from '@mui/material'
import { WizardHeader } from './wizard/WizardHeader'
import { WizardFooter } from './wizard/WizardFooter'
import { ClearAllDataDialog } from './wizard/ClearAllDataDialog'
import { WizardStepperNav } from './wizard/WizardStepperNav'
import { wizardSteps } from './wizard/wizardSteps'
import { WizardStepContent } from './wizard/WizardStepContent'
import { BggApiKeyDialog } from '../components/BggApiKeyDialog'
import { SaveNightDialog } from '../components/SaveNightDialog'
import { useWizardState } from '../hooks/useWizardState'
import { clearAllData } from '../db/db'
import { colors } from '../theme/theme'
import { useToast } from '../services/toast'

export default function WizardPage() {
  const [activeStep, setActiveStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<boolean[]>(() => wizardSteps.map(() => false))
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showClearDialog, setShowClearDialog] = useState(false)

  const wizard = useWizardState()
  const toast = useToast()

  useEffect(() => {
    if (!wizard.userError) return
    toast.error(wizard.userError)
    wizard.clearUserError()
  }, [toast, wizard])

  const handleClearAllData = async () => {
    await clearAllData()
    wizard.reset()
    setShowClearDialog(false)
    window.location.reload() // Reload to clear all in-memory state
  }

  // Show API key dialog when needed
  const showApiDialog = wizard.needsApiKey || showApiKeyDialog

  // Step validation
  const canProceed = useMemo(() => {
    switch (activeStep) {
      case 0: // Players
        return wizard.users.length > 0 && wizard.games.length > 0
      case 1: // Filters
        return wizard.filteredGames.length > 0
      case 2: // Preferences
        return true // Preferences are optional
      case 3: // Result
        return wizard.recommendation.topPick !== null
      default:
        return false
    }
  }, [activeStep, wizard.users, wizard.games, wizard.filteredGames, wizard.recommendation])

  const canGoBack = activeStep > 0
  const canGoNext = activeStep < wizardSteps.length - 1 && canProceed
  const isLastStep = activeStep === wizardSteps.length - 1

  const markStepCompleted = (stepIndex: number) => {
    setCompletedSteps((prev) => {
      const next = [...prev]
      next[stepIndex] = true
      return next
    })
  }

  const onNext = () => { markStepCompleted(activeStep); setActiveStep((s) => Math.min(s + 1, wizardSteps.length - 1)) }
  const onBack = () => setActiveStep((s) => Math.max(s - 1, 0))
  const onSaveNight = async (name: string, description?: string) => {
    try {
      await wizard.saveNight(name, description)
      toast.success('Game night saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save game night')
      throw err
    }
  }
  const onStartOver = () => { wizard.reset(); setActiveStep(0); setCompletedSteps(wizardSteps.map(() => false)) }
  const canJumpTo = (stepIndex: number) => stepIndex <= activeStep || completedSteps[stepIndex - 1]

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        background: `linear-gradient(180deg, ${alpha(colors.skyBlue, 0.1)} 0%, ${alpha(colors.sand, 0.05)} 100%)`,
      }}
    >
      <WizardHeader
        onOpenClearDialog={() => setShowClearDialog(true)}
        onOpenSettings={() => setShowApiKeyDialog(true)}
      />

      <ClearAllDataDialog
        open={showClearDialog}
        onClose={() => setShowClearDialog(false)}
        onConfirm={handleClearAllData}
      />

      {/* API Key Dialog */}
      <BggApiKeyDialog
        open={showApiDialog}
        onClose={() => {
          setShowApiKeyDialog(false)
          wizard.clearNeedsApiKey()
        }}
        onKeySaved={() => {
          wizard.clearNeedsApiKey()
        }}
      />

      {/* Main Content */}
      <Container maxWidth="sm" sx={{ pb: 12, pt: 3 }}>
        <WizardStepperNav
          activeStep={activeStep}
          completedSteps={completedSteps}
          canJumpTo={canJumpTo}
          onSelectStep={setActiveStep}
        />

        <WizardStepContent
          activeStep={activeStep}
          wizard={wizard}
          onOpenSaveDialog={() => setShowSaveDialog(true)}
        />
      </Container>

      <WizardFooter
        canGoBack={canGoBack}
        canGoNext={canGoNext}
        isLastStep={isLastStep}
        canSave={!!wizard.recommendation.topPick}
        onBack={onBack}
        onNext={onNext}
        onStartOver={onStartOver}
        onSave={() => setShowSaveDialog(true)}
      />

      {/* Save Night Dialog */}
      <SaveNightDialog
        open={showSaveDialog}
        playerCount={wizard.users.length}
        gameCount={wizard.sessionGameIds.length}
        topPick={wizard.recommendation.topPick}
        onClose={() => setShowSaveDialog(false)}
        onSave={onSaveNight}
      />
    </Box>
  )
}
