import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { WizardPageViewProps } from './WizardPageView'
import { buildWizardPageViewProps } from './buildWizardPageViewProps'
import { useWizardState } from '../../hooks/useWizardState'
import { useSessionGuestMode } from '../../hooks/useSessionGuestMode'
import { useAuth } from '../../hooks/useAuth'
import { clearAllData } from '../../db/db'
import { useToast } from '../../services/toast'
import { useWizardSessionUiHandlers } from './useWizardSessionUiHandlers'
import { useWizardUrlParams } from './useWizardUrlParams'
import { useWizardSessionSwitching } from './useWizardSessionSwitching'
import { useWizardActiveStepState } from './useWizardActiveStepState'
import { useWizardDialogsState } from './useWizardDialogsState'
import { useWizardNavigationModel } from './useWizardNavigationModel'
import { useWizardSaveNightAction } from './useWizardSaveNightAction'
import { useEnsureLocalOwnerSelected } from './useEnsureLocalOwnerSelected'
import { useWizardPageEffects } from './useWizardPageEffects'
import { wizardSteps } from './wizardSteps'
import { getWizardViewForSession } from './getWizardViewForSession'
import type { BatchAddResult } from '../../components/photoRecognition'

export function useWizardPageController(): WizardPageViewProps {
  const navigate = useNavigate()
  const { activeStep, setActiveStep, completedSteps, setCompletedSteps } = useWizardActiveStepState()
  const dialogs = useWizardDialogsState()
  const [lastLoadedSessionId, setLastLoadedSessionId] = useState<string | null>(null)

  const wizard = useWizardState()
  const { user } = useAuth()
  const toast = useToast()

  useEnsureLocalOwnerSelected(wizard)

  const session = useSessionGuestMode({ wizard, activeStep, setActiveStep })

  useWizardPageEffects({
    wizard,
    toast,
    activeStep,
    setActiveStep,
    sessionGuestMode: session.sessionGuestMode,
    activeSessionId: session.activeSessionId,
  })

  const { activeSessionsState, handleNavigateToSession, handleExitActiveSession, handleSessionCreated, onShareClick } =
    useWizardSessionUiHandlers({
      wizard,
      activeStep,
      setActiveStep: (step) => setActiveStep(step),
      session,
      dialogs,
      setLastLoadedSessionId,
      lastLoadedSessionId,
    })

  useWizardUrlParams({
    activeSessionId: session.activeSessionId,
    setActiveSessionId: session.setActiveSessionId,
    setActiveStep,
    setCompletedSteps,
    setForceCreateNewSession: dialogs.setForceCreateNewSession,
    setShowSessionDialog: dialogs.setShowSessionDialog,
    setLastLoadedSessionId,
    wizard,
  })

  useWizardSessionSwitching({
    activeSessionId: session.activeSessionId,
    lastLoadedSessionId,
    setLastLoadedSessionId,
    sessionGuestMode: session.sessionGuestMode,
    wizard,
    activeStep,
    setActiveStep: (step) => setActiveStep(step),
  })

  const handleClearAllData = useCallback(async () => {
    await clearAllData()
    wizard.reset()
    dialogs.setShowClearDialog(false)
    window.location.reload()
  }, [dialogs, wizard])

  const showApiDialog = wizard.needsApiKey || dialogs.showApiKeyDialog

  const nav = useWizardNavigationModel({
    wizard,
    activeStep,
    setActiveStep,
    completedSteps,
    setCompletedSteps,
    sessionGuestMode: session.sessionGuestMode,
    hasGamesInSessionMode: session.hasGamesInSessionMode,
    activeSessionId: session.activeSessionId,
  })

  const handleAfterSaveNight = useCallback(() => {
    session.setActiveSessionId(null)
    setLastLoadedSessionId(null)

    wizard.resetForNewSession()
    setActiveStep(0)
    setCompletedSteps(wizardSteps.map(() => false))
  }, [session, setActiveStep, setCompletedSteps, setLastLoadedSessionId, wizard])

  const wizardForView = getWizardViewForSession({
    wizard,
    activeSessionId: session.activeSessionId,
    mergedUsers: session.mergedUsers,
    mergedPreferences: session.mergedPreferences,
  })

  const onSaveNight = useWizardSaveNightAction({
    // Important: use the same wizard view the Results screen renders.
    // In session mode, this view contains merged users/preferences + a merged recommendation.
    wizard: wizardForView,
    toast,
    activeSessionId: session.activeSessionId,
    onSaved: handleAfterSaveNight,
  })

  // Photo Recognition (REQ-109) - Handle batch result from recognition dialog
  // State updates are now handled by addGameToUser in the dialog, so this just shows the toast
  const handleGamesAddedFromRecognition = useCallback(
    (result: BatchAddResult) => {
      // Show summary toast
      const total = result.succeeded.length + result.failed.length
      if (result.failed.length === 0) {
        toast.success(`Added ${result.succeeded.length} game${result.succeeded.length !== 1 ? 's' : ''} to your collection`)
      } else if (result.succeeded.length === 0) {
        toast.error(`Failed to add ${result.failed.length} game${result.failed.length !== 1 ? 's' : ''}`)
      } else {
        toast.warning(`Added ${result.succeeded.length} of ${total} games (${result.failed.length} failed)`)
      }
    },
    [toast]
  )

  // Get owner username for photo recognition
  const photoRecognitionOwnerUsername = wizard.users.find((u) => u.isOrganizer)?.username || wizard.users[0]?.username || ''

  const stepSubtitles = nav.stepSubtitles
  const isSessionFrozen = Boolean(session.activeSessionId && !session.sessionGuestMode)
  const lockedSteps = isSessionFrozen ? [0, 1] : session.lockedSteps
  const disabledSteps = isSessionFrozen ? [] : session.disabledSteps

  return buildWizardPageViewProps({
    activeStep,
    setActiveStep,
    completedSteps,
    lockedSteps,
    disabledSteps,
    stepSubtitles,
    compactBadgeCount: nav.compactBadgeCount,
    canJumpTo: nav.canJumpTo,
    wizard: wizardForView,
    user,
    activeSessions: activeSessionsState.sessions,
    activeSessionsCurrentId: activeSessionsState.currentSessionId,
    onNavigateToSession: handleNavigateToSession,
    onExitActiveSession: handleExitActiveSession,
    sessionGuestMode: session.sessionGuestMode,
    hasGamesInSessionMode: session.hasGamesInSessionMode,
    onExitSessionMode: session.handleExitSessionMode,
    mergedUsers: session.mergedUsers,
    mergedPreferences: session.mergedPreferences,
    guestStatuses: session.guestStatuses,
    guestUsersForSave: session.guestUsersForSave,
    activeSessionId: session.activeSessionId,
    canCreateSession: session.canCreateSession,
    canGoBack: nav.canGoBack,
    canGoNext: nav.canGoNext,
    isLastStep: nav.isLastStep,
    onBack: nav.onBack,
    onNext: nav.onNext,
    onStartOver: nav.onStartOver,
    onOpenSessions: () => {
      navigate('/sessions')
    },
    showClearDialog: dialogs.showClearDialog,
    onOpenClearDialog: () => dialogs.setShowClearDialog(true),
    onCloseClearDialog: () => dialogs.setShowClearDialog(false),
    onConfirmClearAllData: handleClearAllData,
    showApiDialog,
    onOpenApiDialog: () => dialogs.setShowApiKeyDialog(true),
    onCloseApiDialog: () => {
      dialogs.setShowApiKeyDialog(false)
      wizard.clearNeedsApiKey()
    },
    showHelpDialog: dialogs.showHelpDialog,
    onOpenHelpDialog: () => dialogs.setShowHelpDialog(true),
    onCloseHelpDialog: () => dialogs.setShowHelpDialog(false),
    showBackupDialog: dialogs.showBackupDialog,
    onOpenBackupDialog: () => dialogs.setShowBackupDialog(true),
    onCloseBackupDialog: () => dialogs.setShowBackupDialog(false),
    showSaveDialog: dialogs.showSaveDialog,
    onOpenSaveDialog: () => dialogs.setShowSaveDialog(true),
    onCloseSaveDialog: () => dialogs.setShowSaveDialog(false),
    onSaveNight,
    showSessionDialog: dialogs.showSessionDialog,
    forceCreateNewSession: dialogs.forceCreateNewSession,
    onCloseSessionDialog: () => {
      dialogs.setShowSessionDialog(false)
      dialogs.setForceCreateNewSession(false)
    },
    onSessionCreated: handleSessionCreated,
    onSessionCancelled: () => session.setActiveSessionId(null),
    showSessionInviteDialog: dialogs.showSessionInviteDialog,
    onCloseSessionInviteDialog: () => dialogs.setShowSessionInviteDialog(false),
    onShareClick,
    // Photo Recognition (REQ-109)
    showPhotoRecognitionDialog: dialogs.showPhotoRecognitionDialog,
    onOpenPhotoRecognition: () => dialogs.setShowPhotoRecognitionDialog(true),
    onClosePhotoRecognition: () => dialogs.setShowPhotoRecognitionDialog(false),
    showOpenAiApiKeyDialog: dialogs.showOpenAiApiKeyDialog,
    onOpenOpenAiApiKeyDialog: () => {
      dialogs.setShowPhotoRecognitionDialog(false)
      dialogs.setShowOpenAiApiKeyDialog(true)
    },
    onCloseOpenAiApiKeyDialog: () => dialogs.setShowOpenAiApiKeyDialog(false),
    onGamesAddedFromRecognition: handleGamesAddedFromRecognition,
    photoRecognitionOwnerUsername,
  })
}
