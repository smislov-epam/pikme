import type { User } from 'firebase/auth'
import type { WizardActions, WizardState } from '../../hooks/useWizardState'
import type { ActiveSessionInfo } from '../../hooks/useActiveSessions'
import type { WizardPageViewProps } from './WizardPageView'

export function buildWizardPageViewProps(args: {
  activeStep: number
  setActiveStep: WizardPageViewProps['setActiveStep']
  completedSteps: boolean[]
  lockedSteps: number[]
  disabledSteps: number[]
  stepSubtitles: string[]
  compactBadgeCount: number
  canJumpTo: (stepIndex: number) => boolean
  wizard: WizardState & WizardActions
  user: User | null
  activeSessions: ActiveSessionInfo[]
  activeSessionsCurrentId: string | null
  onNavigateToSession: (sessionId: string) => void
  onExitActiveSession: (sessionId: string) => void
  sessionGuestMode: string | null
  hasGamesInSessionMode: boolean
  onExitSessionMode: () => void
  mergedUsers: WizardState['users']
  mergedPreferences: WizardState['preferences']
  guestStatuses: WizardPageViewProps['guestStatuses']
  guestUsersForSave: WizardPageViewProps['guestUsersForSave']
  activeSessionId: string | null
  canCreateSession: boolean
  canGoBack: boolean
  canGoNext: boolean
  isLastStep: boolean
  onBack: () => void
  onNext: () => void
  onStartOver: () => void
  onOpenSessions: () => void
  showClearDialog: boolean
  onOpenClearDialog: () => void
  onCloseClearDialog: () => void
  onConfirmClearAllData: () => void
  showApiDialog: boolean
  onOpenApiDialog: () => void
  onCloseApiDialog: () => void
  showHelpDialog: boolean
  onOpenHelpDialog: () => void
  onCloseHelpDialog: () => void
  showBackupDialog: boolean
  onOpenBackupDialog: () => void
  onCloseBackupDialog: () => void
  showSaveDialog: boolean
  onOpenSaveDialog: () => void
  onCloseSaveDialog: () => void
  onSaveNight: WizardPageViewProps['onSaveNight']
  showSessionDialog: boolean
  forceCreateNewSession: boolean
  onCloseSessionDialog: () => void
  onSessionCreated: (sessionId: string) => void
  onSessionCancelled: () => void
  showSessionInviteDialog: boolean
  onCloseSessionInviteDialog: () => void
  onShareClick: () => void
  // Photo Recognition (REQ-109)
  showPhotoRecognitionDialog: boolean
  onOpenPhotoRecognition: () => void
  onClosePhotoRecognition: () => void
  showOpenAiApiKeyDialog: boolean
  onOpenOpenAiApiKeyDialog: () => void
  onCloseOpenAiApiKeyDialog: () => void
  onGamesAddedFromRecognition: WizardPageViewProps['onGamesAddedFromRecognition']
  photoRecognitionOwnerUsername: string
}): WizardPageViewProps {
  return {
    activeStep: args.activeStep,
    setActiveStep: args.setActiveStep,
    completedSteps: args.completedSteps,
    lockedSteps: args.lockedSteps,
    disabledSteps: args.disabledSteps,
    stepSubtitles: args.stepSubtitles,
    compactBadgeCount: args.compactBadgeCount,
    canJumpTo: args.canJumpTo,

    wizard: args.wizard,
    user: args.user,

    activeSessions: args.activeSessions,
    activeSessionsCurrentId: args.activeSessionsCurrentId,
    onNavigateToSession: args.onNavigateToSession,
    onExitActiveSession: args.onExitActiveSession,

    sessionGuestMode: args.sessionGuestMode,
    hasGamesInSessionMode: args.hasGamesInSessionMode,
    onExitSessionMode: args.onExitSessionMode,

    mergedUsers: args.mergedUsers,
    mergedPreferences: args.mergedPreferences,
    guestStatuses: args.guestStatuses,
    guestUsersForSave: args.guestUsersForSave,

    activeSessionId: args.activeSessionId,
    canCreateSession: args.canCreateSession,

    canGoBack: args.canGoBack,
    canGoNext: args.canGoNext,
    isLastStep: args.isLastStep,

    onBack: args.onBack,
    onNext: args.onNext,
    onStartOver: args.onStartOver,
    onOpenSessions: args.onOpenSessions,

    showClearDialog: args.showClearDialog,
    onOpenClearDialog: args.onOpenClearDialog,
    onCloseClearDialog: args.onCloseClearDialog,
    onConfirmClearAllData: args.onConfirmClearAllData,

    showApiDialog: args.showApiDialog,
    onOpenApiDialog: args.onOpenApiDialog,
    onCloseApiDialog: args.onCloseApiDialog,

    showHelpDialog: args.showHelpDialog,
    onOpenHelpDialog: args.onOpenHelpDialog,
    onCloseHelpDialog: args.onCloseHelpDialog,

    showBackupDialog: args.showBackupDialog,
    onOpenBackupDialog: args.onOpenBackupDialog,
    onCloseBackupDialog: args.onCloseBackupDialog,

    showSaveDialog: args.showSaveDialog,
    onOpenSaveDialog: args.onOpenSaveDialog,
    onCloseSaveDialog: args.onCloseSaveDialog,
    onSaveNight: args.onSaveNight,

    showSessionDialog: args.showSessionDialog,
    forceCreateNewSession: args.forceCreateNewSession,
    onCloseSessionDialog: args.onCloseSessionDialog,
    onSessionCreated: args.onSessionCreated,
    onSessionCancelled: args.onSessionCancelled,

    showSessionInviteDialog: args.showSessionInviteDialog,
    onCloseSessionInviteDialog: args.onCloseSessionInviteDialog,
    onShareClick: args.onShareClick,

    // Photo Recognition (REQ-109)
    showPhotoRecognitionDialog: args.showPhotoRecognitionDialog,
    onOpenPhotoRecognition: args.onOpenPhotoRecognition,
    onClosePhotoRecognition: args.onClosePhotoRecognition,
    showOpenAiApiKeyDialog: args.showOpenAiApiKeyDialog,
    onOpenOpenAiApiKeyDialog: args.onOpenOpenAiApiKeyDialog,
    onCloseOpenAiApiKeyDialog: args.onCloseOpenAiApiKeyDialog,
    onGamesAddedFromRecognition: args.onGamesAddedFromRecognition,
    photoRecognitionOwnerUsername: args.photoRecognitionOwnerUsername,
  }
}
