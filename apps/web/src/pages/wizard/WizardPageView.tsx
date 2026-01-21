import { Alert, Box, Button, Container, alpha } from '@mui/material'
import type { User } from 'firebase/auth'
import { ActiveSessionBanner, CreateSessionDialog, SessionInviteDialog } from '../../components/session'
import { BackupRestoreDialog } from '../../components/BackupRestoreDialog'
import { BggApiKeyDialog } from '../../components/BggApiKeyDialog'
import { HelpWalkthroughDialog } from '../../components/HelpWalkthroughDialog'
import { OpenAiApiKeyDialog } from '../../components/OpenAiApiKeyDialog'
import { PhotoRecognitionDialog } from '../../components/photoRecognition'
import { SaveNightDialog } from '../../components/SaveNightDialog'
import type { ActiveSessionInfo } from '../../hooks/useActiveSessions'
import type { WizardActions, WizardState } from '../../hooks/useWizardState'
import { colors } from '../../theme/theme'
import { ClearAllDataDialog } from '../wizard/ClearAllDataDialog'
import { WizardFooter } from '../wizard/WizardFooter'
import { WizardHeader } from '../wizard/WizardHeader'
import { WizardStepperNav } from '../wizard/WizardStepperNav'
import { WizardStepContent } from '../wizard/WizardStepContent'
import type { RecognizedGameTile } from '../../services/openai/photoRecognition'

export type WizardPageViewProps = {
  activeStep: number; setActiveStep: (step: number | ((prev: number) => number)) => void; completedSteps: boolean[]; lockedSteps: number[]; disabledSteps: number[]; stepSubtitles: string[]; compactBadgeCount: number; canJumpTo: (stepIndex: number) => boolean
  wizard: WizardState & WizardActions; user: User | null
  activeSessions: ActiveSessionInfo[]; activeSessionsCurrentId: string | null; onNavigateToSession: (sessionId: string) => void; onExitActiveSession: (sessionId: string) => void
  sessionGuestMode: string | null; hasGamesInSessionMode: boolean; onExitSessionMode: () => void
  mergedUsers: WizardState['users']; mergedPreferences: WizardState['preferences']; guestStatuses: Array<{ username: string; ready: boolean; updatedAt: number | null }>; guestUsersForSave: Array<{ username: string; displayName: string }>
  activeSessionId: string | null; canCreateSession: boolean
  canGoBack: boolean; canGoNext: boolean; isLastStep: boolean
  onBack: () => void; onNext: () => void; onStartOver: () => void; onOpenSessions: () => void
  showClearDialog: boolean; onOpenClearDialog: () => void; onCloseClearDialog: () => void; onConfirmClearAllData: () => void
  showApiDialog: boolean; onOpenApiDialog: () => void; onCloseApiDialog: () => void; showHelpDialog: boolean; onOpenHelpDialog: () => void; onCloseHelpDialog: () => void; showBackupDialog: boolean; onOpenBackupDialog: () => void; onCloseBackupDialog: () => void
  showSaveDialog: boolean; onOpenSaveDialog: () => void; onCloseSaveDialog: () => void; onSaveNight: (name: string, description?: string, includeGuestUsernames?: string[]) => Promise<void>
  showSessionDialog: boolean; forceCreateNewSession: boolean; onCloseSessionDialog: () => void; onSessionCreated: (sessionId: string) => void; onSessionCancelled: () => void
  showSessionInviteDialog: boolean; onCloseSessionInviteDialog: () => void; onShareClick: () => void
  // Photo Recognition (REQ-109)
  showPhotoRecognitionDialog: boolean; onOpenPhotoRecognition: () => void; onClosePhotoRecognition: () => void
  showOpenAiApiKeyDialog: boolean; onOpenOpenAiApiKeyDialog: () => void; onCloseOpenAiApiKeyDialog: () => void
  onAddRecognizedGame: (game: RecognizedGameTile) => Promise<void>
}

export function WizardPageView(props: WizardPageViewProps) {
  const hostDisplayName = props.user?.displayName || props.user?.email?.split('@')[0] || 'Host'

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        background: `linear-gradient(180deg, ${alpha(colors.skyBlue, 0.1)} 0%, ${alpha(colors.sand, 0.05)} 100%)`,
      }}
    >
      <WizardHeader
        onOpenClearDialog={props.onOpenClearDialog}
        onOpenBackup={props.onOpenBackupDialog}
        onOpenSettings={props.onOpenApiDialog}
        onOpenHelp={props.onOpenHelpDialog}
        onOpenPhotoRecognition={props.onOpenPhotoRecognition}
        activeSessionCount={props.activeSessions.length}
        onOpenSessions={props.onOpenSessions}
      />

      {/* Active Session Banner (REQ-106) */}
      {props.activeSessions.length > 0 && (
        <ActiveSessionBanner
          sessions={props.activeSessions}
          currentSessionId={props.activeSessionsCurrentId}
          onNavigateToSession={props.onNavigateToSession}
          onExitSession={props.onExitActiveSession}
        />
      )}

      <ClearAllDataDialog
        open={props.showClearDialog}
        onClose={props.onCloseClearDialog}
        onConfirm={props.onConfirmClearAllData}
      />

      <BggApiKeyDialog
        open={props.showApiDialog}
        onClose={props.onCloseApiDialog}
        onKeySaved={() => {
          props.wizard.clearNeedsApiKey()
        }}
      />

      <HelpWalkthroughDialog open={props.showHelpDialog} onClose={props.onCloseHelpDialog} />
      <BackupRestoreDialog open={props.showBackupDialog} onClose={props.onCloseBackupDialog} />

      {/* Photo Recognition (REQ-109) */}
      <OpenAiApiKeyDialog
        open={props.showOpenAiApiKeyDialog}
        onClose={props.onCloseOpenAiApiKeyDialog}
        onKeySaved={props.onCloseOpenAiApiKeyDialog}
      />
      <PhotoRecognitionDialog
        open={props.showPhotoRecognitionDialog}
        onClose={props.onClosePhotoRecognition}
        onAddGame={props.onAddRecognizedGame}
        onOpenApiKeyDialog={props.onOpenOpenAiApiKeyDialog}
      />

      <Container maxWidth="md" sx={{ pb: 12, pt: 3, maxWidth: { lg: 1120 }, px: { xs: 2, sm: 3 } }}>
        {props.sessionGuestMode && (
          <Alert
            severity="info"
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={props.onExitSessionMode}>
                Exit Session
              </Button>
            }
          >
            {props.wizard.games.length > 0
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
            width: '100%',
          }}
        >
          <WizardStepperNav
            activeStep={props.activeStep}
            completedSteps={props.completedSteps}
            lockedSteps={props.lockedSteps}
            stepSubtitles={props.stepSubtitles}
            compactBadgeCount={props.compactBadgeCount}
            canJumpTo={props.canJumpTo}
            onSelectStep={props.setActiveStep}
          />
        </Box>

        <WizardStepContent
          activeStep={props.activeStep}
          wizard={props.wizard}
          onOpenSaveDialog={props.onOpenSaveDialog}
          mergedUsers={props.mergedUsers}
          mergedPreferences={props.mergedPreferences}
          guestStatuses={props.guestStatuses}
          sessionGuestMode={props.sessionGuestMode}
          disabledSteps={props.disabledSteps}
          activeSessionId={props.activeSessionId}
        />
      </Container>

      <WizardFooter
        canGoBack={props.canGoBack}
        canGoNext={props.canGoNext}
        isLastStep={props.isLastStep}
        canSave={!!props.wizard.recommendation.topPick}
        canShare={props.canCreateSession}
        sessionGuestMode={props.hasGamesInSessionMode}
        onBack={props.onBack}
        onNext={props.onNext}
        onStartOver={props.onStartOver}
        onSave={props.onOpenSaveDialog}
        onShare={props.onShareClick}
        onExitSession={props.onExitSessionMode}
        hasSession={props.activeSessionId !== null}
      />

      <SaveNightDialog
        open={props.showSaveDialog}
        playerCount={props.wizard.users.length}
        gameCount={props.wizard.sessionGameIds.length}
        topPick={props.wizard.recommendation.topPick}
        guestUsers={props.guestUsersForSave}
        onClose={props.onCloseSaveDialog}
        onSave={props.onSaveNight}
      />

      <CreateSessionDialog
        open={props.showSessionDialog}
        games={props.wizard.filteredGames}
        playerCount={props.wizard.filters.playerCount}
        minPlayingTime={props.wizard.filters.timeRange.min}
        maxPlayingTime={props.wizard.filters.timeRange.max}
        hostDisplayName={hostDisplayName}
        users={props.wizard.users}
        preferences={props.wizard.preferences}
        existingSessionId={props.activeSessionId}
        forceCreateNew={props.forceCreateNewSession}
        onClose={props.onCloseSessionDialog}
        onSessionCreated={props.onSessionCreated}
        onSessionCancelled={props.onSessionCancelled}
      />

      <SessionInviteDialog
        open={props.showSessionInviteDialog}
        sessionId={props.activeSessionId}
        onClose={props.onCloseSessionInviteDialog}
      />
    </Box>
  )
}
