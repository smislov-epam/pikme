import type { WizardState } from '../useWizardState'
import type { useSessionGuests } from '../useSessionGuests'

export interface UseSessionGuestModeOptions {
  wizard: WizardState
  activeStep: number
  setActiveStep: (step: number) => void
}

export interface SessionGuestModeResult {
  /** Session ID if in guest mode, null otherwise */
  sessionGuestMode: string | null
  /** Whether user has games while in session mode */
  hasGamesInSessionMode: boolean
  /** Exit session guest mode */
  handleExitSessionMode: () => void
  /** Merged users (wizard users + session guests) */
  mergedUsers: WizardState['users']
  /** Merged preferences (wizard preferences + guest preferences) */
  mergedPreferences: WizardState['preferences']
  /** Guest statuses for tabs */
  guestStatuses: Array<{ username: string; ready: boolean; updatedAt: number | null }>
  /** Guest users for save dialog */
  guestUsersForSave: Array<{ username: string; displayName: string }>
  /** Session guests from hook */
  sessionGuests: ReturnType<typeof useSessionGuests>['guests']
  /** Active session ID for host */
  activeSessionId: string | null
  /** Set active session ID */
  setActiveSessionId: (id: string | null) => void
  /** Whether user can create sessions */
  canCreateSession: boolean
  /** Locked steps in session guest mode */
  lockedSteps: number[]
  /** Steps with disabled controls (viewable but not editable) */
  disabledSteps: number[]
}
