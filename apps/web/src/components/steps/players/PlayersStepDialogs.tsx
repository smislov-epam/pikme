import type { UserRecord } from '../../../db/types'
import { BggUserNotFoundDialog } from './BggUserNotFoundDialog'
import { DuplicateUserNameDialog } from './DuplicateUserNameDialog'
import { ReusePreviousGamesDialog } from './ReusePreviousGamesDialog'

export interface PendingDuplicateUser {
  name: string
  existingUsers: UserRecord[]
}

export function PlayersStepDialogs(props: {
  pendingBggUserNotFoundUsername: string | null
  onConfirmAddBggUserAnyway: () => void
  onCancelAddBggUserAnyway: () => void
  pendingReuseGamesNight: { id: number; name: string; gameCount: number } | null
  onConfirmReuseGamesFromNight: () => void
  onDismissReuseGamesPrompt: () => void
  pendingDuplicateUser: PendingDuplicateUser | null
  onSelectExistingUser: (user: UserRecord) => void
  onCreateNewDuplicateUser: () => void
  onCancelDuplicateUser: () => void
  isLoading: boolean
}) {
  const {
    pendingBggUserNotFoundUsername,
    onConfirmAddBggUserAnyway,
    onCancelAddBggUserAnyway,
    pendingReuseGamesNight,
    onConfirmReuseGamesFromNight,
    onDismissReuseGamesPrompt,
    pendingDuplicateUser,
    onSelectExistingUser,
    onCreateNewDuplicateUser,
    onCancelDuplicateUser,
    isLoading,
  } = props

  return (
    <>
      {pendingBggUserNotFoundUsername ? (
        <BggUserNotFoundDialog
          open={true}
          username={pendingBggUserNotFoundUsername}
          isLoading={isLoading}
          onCancel={onCancelAddBggUserAnyway}
          onConfirm={onConfirmAddBggUserAnyway}
        />
      ) : null}

      {pendingReuseGamesNight ? (
        <ReusePreviousGamesDialog
          open={true}
          nightName={pendingReuseGamesNight.name}
          gameCount={pendingReuseGamesNight.gameCount}
          isLoading={isLoading}
          onDismiss={onDismissReuseGamesPrompt}
          onConfirm={onConfirmReuseGamesFromNight}
        />
      ) : null}

      {pendingDuplicateUser ? (
        <DuplicateUserNameDialog
          open={true}
          name={pendingDuplicateUser.name}
          existingUsers={pendingDuplicateUser.existingUsers}
          isLoading={isLoading}
          onCancel={onCancelDuplicateUser}
          onSelectExisting={onSelectExistingUser}
          onCreateNew={onCreateNewDuplicateUser}
        />
      ) : null}
    </>
  )
}
