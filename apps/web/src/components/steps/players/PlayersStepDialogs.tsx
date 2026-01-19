import type { UserRecord } from '../../../db/types'
import { BggUserNotFoundDialog } from './BggUserNotFoundDialog'
import { DuplicateUserNameDialog } from './DuplicateUserNameDialog'

export interface PendingDuplicateUser {
  name: string
  existingUsers: UserRecord[]
}

export function PlayersStepDialogs(props: {
  pendingBggUserNotFoundUsername: string | null
  onConfirmAddBggUserAnyway: () => void
  onCancelAddBggUserAnyway: () => void
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
