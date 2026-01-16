import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Container,
  alpha,
  Alert,
  Button,
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
import { BackupRestoreDialog } from '../components/BackupRestoreDialog'
import { CreateSessionDialog } from '../components/session'
import { useWizardState } from '../hooks/useWizardState'
import { useSessionGuestMode } from '../hooks/useSessionGuestMode'
import { useAuth } from '../hooks/useAuth'
import { clearAllData } from '../db/db'
import { colors } from '../theme/theme'
import { useToast } from '../services/toast'
import { trackGameNightSaved, trackWizardStepView } from '../services/analytics/googleAnalytics'

export default function WizardPage() {
  const [activeStep, setActiveStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<boolean[]>(() => wizardSteps.map(() => false))
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [showHelpDialog, setShowHelpDialog] = useState(false)
  const [showBackupDialog, setShowBackupDialog] = useState(false)
  const [showSessionDialog, setShowSessionDialog] = useState(false)

  const wizard = useWizardState()
  const { user } = useAuth()
  const toast = useToast()

  // Session guest mode hook - handles all session-related state and merging
  const {
    sessionGuestMode,
    hasGamesInSessionMode,
    handleExitSessionMode,
    mergedUsers,
    mergedPreferences,
    guestStatuses,
    guestUsersForSave,
    activeSessionId,
    setActiveSessionId,
    canCreateSession,
    lockedSteps,
  } = useSessionGuestMode({
    wizard,
    activeStep,
    setActiveStep,
  })

  useEffect(() => {
    if (!wizard.userError) return
    toast.error(wizard.userError)
    wizard.clearUserError()
  }, [toast, wizard])

  useEffect(() => {
    const stepName = wizardSteps[activeStep] ?? `Step ${activeStep + 1}`
    trackWizardStepView(stepName, {
      stepIndex: activeStep,
      playerCount: wizard.users.length,
      sessionGames: wizard.sessionGameIds.length,
      filteredGames: wizard.filteredGames.length,
    })
  }, [activeStep, wizard.filteredGames.length, wizard.sessionGameIds.length, wizard.users.length])

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

  // In session guest mode with games, can't go back from Preferences (step 2) since Players/Filters are locked
  const canGoBack = hasGamesInSessionMode ? false : activeStep > 0
  // In session guest mode with games, can't go next to Result (step 3) since it's locked
  const canGoNext = hasGamesInSessionMode
    ? false // Can't proceed to Result in session guest mode
    : activeStep < wizardSteps.length - 1 && canProceed
  // In session guest mode with games, Preferences is effectively the last step
  const isLastStep = hasGamesInSessionMode ? activeStep === 2 : activeStep === wizardSteps.length - 1

  const markStepCompleted = (stepIndex: number) => {
    setCompletedSteps((prev) => {
      const next = [...prev]
      next[stepIndex] = true
      return next
    })
  }

  const onNext = () => { markStepCompleted(activeStep); setActiveStep((s) => Math.min(s + 1, wizardSteps.length - 1)) }
  const onBack = () => setActiveStep((s) => Math.max(s - 1, 0))
  const onSaveNight = async (
    name: string,
    description?: string,
    includeGuestUsernames?: string[],
  ) => {
    try {
      await wizard.saveNight(name, description, includeGuestUsernames)
      toast.success('Game night saved')
      trackGameNightSaved({
        playerCount: wizard.users.length,
        sessionGames: wizard.sessionGameIds.length,
        topPickName: wizard.recommendation.topPick?.game.name,
        hasDescription: Boolean(description),
      })
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
  const canJumpTo = (stepIndex: number) => {
    // In session guest mode WITH games, steps 0 (Players), 1 (Filters), and 3 (Result) are locked
    // If no games yet, let user do normal onboarding (Players/Filters unlocked)
    const hasGames = wizard.games.length > 0
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
        onOpenBackup={() => setShowBackupDialog(true)}
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

      <BackupRestoreDialog open={showBackupDialog} onClose={() => setShowBackupDialog(false)} />

      {/* Main Content */}
      <Container maxWidth="md" sx={{ pb: 12, pt: 3, maxWidth: { lg: 1120 } }}>
        {/* Session Guest Mode Banner - show different message based on whether user has games */}
        {sessionGuestMode && (
          <Alert
            severity="info"
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={handleExitSessionMode}>
                Exit Session
              </Button>
            }
          >
            {wizard.games.length > 0
              ? "You're in a session. Set your preferences and the host will see your choices."
              : "You're joining a session. Add your game collection first, then set your preferences."}
          </Alert>
        )}

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
            lockedSteps={lockedSteps}
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
          mergedUsers={mergedUsers}
          mergedPreferences={mergedPreferences}
          guestStatuses={guestStatuses}
        />
      </Container>

      <WizardFooter
        canGoBack={canGoBack}
        canGoNext={canGoNext}
        isLastStep={isLastStep}
        canSave={!!wizard.recommendation.topPick}
        canShare={canCreateSession}
        sessionGuestMode={hasGamesInSessionMode}
        onBack={onBack}
        onNext={onNext}
        onStartOver={onStartOver}
        onSave={() => setShowSaveDialog(true)}
        onShare={() => setShowSessionDialog(true)}
        onExitSession={handleExitSessionMode}
        hasSession={activeSessionId !== null}
      />

      {/* Save Night Dialog */}
      <SaveNightDialog
        open={showSaveDialog}
        playerCount={wizard.users.length}
        gameCount={wizard.sessionGameIds.length}
        topPick={wizard.recommendation.topPick}
        guestUsers={guestUsersForSave}
        onClose={() => setShowSaveDialog(false)}
        onSave={onSaveNight}
      />

      {/* Create Session Dialog - uses filtered games, not all games */}
      <CreateSessionDialog
        open={showSessionDialog}
        games={wizard.filteredGames}
        playerCount={wizard.filters.playerCount}
        minPlayingTime={wizard.filters.timeRange.min}
        maxPlayingTime={wizard.filters.timeRange.max}
        hostDisplayName={user?.displayName || user?.email?.split('@')[0] || 'Host'}
        users={wizard.users}
        preferences={wizard.preferences}
        existingSessionId={activeSessionId}
        onClose={() => setShowSessionDialog(false)}
        onSessionCreated={setActiveSessionId}
        onSessionCancelled={() => setActiveSessionId(null)}
      />
    </Box>
  )
}
