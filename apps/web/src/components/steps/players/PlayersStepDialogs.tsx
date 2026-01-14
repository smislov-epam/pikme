import { BggUserNotFoundDialog } from './BggUserNotFoundDialog'
import { ReusePreviousGamesDialog } from './ReusePreviousGamesDialog'

export function PlayersStepDialogs(props: {
  pendingBggUserNotFoundUsername: string | null
  onConfirmAddBggUserAnyway: () => void
  onCancelAddBggUserAnyway: () => void
  pendingReuseGamesNight: { id: number; name: string; gameCount: number } | null
  onConfirmReuseGamesFromNight: () => void
  onDismissReuseGamesPrompt: () => void
  isLoading: boolean
}) {
  const {
    pendingBggUserNotFoundUsername,
    onConfirmAddBggUserAnyway,
    onCancelAddBggUserAnyway,
    pendingReuseGamesNight,
    onConfirmReuseGamesFromNight,
    onDismissReuseGamesPrompt,
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
    </>
  )
}
