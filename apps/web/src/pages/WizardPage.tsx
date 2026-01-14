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
import { HelpWalkthroughDialog } from '../components/HelpWalkthroughDialog'
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
  const [showHelpDialog, setShowHelpDialog] = useState(false)

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
  const onStartOver = async () => {
    wizard.reset()
    setActiveStep(0)
    setCompletedSteps(wizardSteps.map(() => false))
    await wizard.loadSavedNights()
  }
  const canJumpTo = (stepIndex: number) => stepIndex <= activeStep || completedSteps[stepIndex - 1]

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
        onOpenHelp={() => setShowHelpDialog(true)}
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

      <HelpWalkthroughDialog
        open={showHelpDialog}
        onClose={() => {
          setShowHelpDialog(false)
        }}
      />

      {/* Main Content */}
      <Container maxWidth="md" sx={{ pb: 12, pt: 3, maxWidth: { lg: 1120 } }}>
        <Box
          sx={{
            position: 'sticky',
            top: { xs: 62, sm: 66 },
            zIndex: 5,
            mt: { xs: -1.25, sm: -1.75 },
            mb: 3,
          }}
        >
          <WizardStepperNav
            activeStep={activeStep}
            completedSteps={completedSteps}
            stepSubtitles={stepSubtitles}
            compactBadgeCount={compactBadgeCount}
            canJumpTo={canJumpTo}
            onSelectStep={setActiveStep}
          />
        </Box>

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
