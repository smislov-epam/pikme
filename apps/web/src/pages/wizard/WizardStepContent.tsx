import { PlayersStep, FiltersStep, PreferencesStep, ResultStep } from '../../components/steps'
import type { WizardState, WizardActions } from '../../hooks/useWizardState'

export function WizardStepContent(props: {
  activeStep: number
  wizard: WizardState & WizardActions
  onOpenSaveDialog: () => void
}) {
  const { activeStep, wizard, onOpenSaveDialog } = props

  switch (activeStep) {
    case 0:
      return (
        <PlayersStep
          users={wizard.users}
          games={wizard.games}
          sessionGames={wizard.sessionGames}
          gameOwners={wizard.gameOwners}
          layoutMode={wizard.layoutMode}
          onLayoutModeChange={wizard.setLayoutMode}
          existingLocalUsers={wizard.existingLocalUsers}
          savedNights={wizard.savedNights}
          pendingBggUserNotFoundUsername={wizard.pendingBggUserNotFoundUsername}
          onConfirmAddBggUserAnyway={wizard.confirmAddBggUserAnyway}
          onCancelAddBggUserAnyway={wizard.cancelAddBggUserAnyway}
          pendingReuseGamesNight={wizard.pendingReuseGamesNight}
          onConfirmReuseGamesFromNight={wizard.confirmReuseGamesFromNight}
          onDismissReuseGamesPrompt={wizard.dismissReuseGamesPrompt}
          onAddBggUser={wizard.addBggUser}
          onAddLocalUser={wizard.addLocalUser}
          onRemoveUser={wizard.removeUser}
          onDeleteUser={wizard.deleteUserPermanently}
          onSetOrganizer={wizard.setOrganizer}
          onSearchGame={wizard.searchGame}
          onAddGameToUser={wizard.addGameToUser}
          onRemoveGameFromUser={wizard.removeGameFromUser}
          onAddGameToSession={wizard.addGameToSession}
          onRemoveGameFromSession={wizard.removeGameFromSession}
          onExcludeGameFromSession={wizard.excludeGameFromSession}
          onUndoExcludeGameFromSession={wizard.undoExcludeGameFromSession}
          onAddOwnerToGame={wizard.addOwnerToGame}
          onLoadSavedNight={wizard.loadSavedNight}
          onFetchGameInfo={wizard.fetchGameInfo}
          onAddGameManually={wizard.addGameManually}
          onEditGame={wizard.updateGame}
          onRefreshGameFromBgg={wizard.refreshGameFromBgg}
          isLoading={wizard.isLoadingUser}
          error={wizard.userError}
        />
      )
    case 1:
      return (
        <FiltersStep
          games={wizard.sessionGames}
          users={wizard.users}
          gameOwners={wizard.gameOwners}
          sessionUserCount={wizard.users.length}
          layoutMode={wizard.layoutMode}
          onLayoutModeChange={wizard.setLayoutMode}
          playerCount={wizard.filters.playerCount}
          onPlayerCountChange={wizard.setPlayerCount}
          timeRange={wizard.filters.timeRange}
          onTimeRangeChange={wizard.setTimeRange}
          mode={wizard.filters.mode}
          onModeChange={wizard.setMode}
          excludeLowRatedThreshold={wizard.filters.excludeLowRatedThreshold}
          onExcludeLowRatedChange={wizard.setExcludeLowRated}
          ageRange={wizard.filters.ageRange}
          onAgeRangeChange={wizard.setAgeRange}
          complexityRange={wizard.filters.complexityRange}
          onComplexityRangeChange={wizard.setComplexityRange}
          ratingRange={wizard.filters.ratingRange}
          onRatingRangeChange={wizard.setRatingRange}
          filteredGames={wizard.filteredGames}
          onExcludeGameFromSession={wizard.excludeGameFromSession}
          onUndoExcludeGameFromSession={wizard.undoExcludeGameFromSession}
        />
      )
    case 2:
      return (
        <PreferencesStep
          users={wizard.users}
          games={wizard.filteredGames}
          gameOwners={wizard.gameOwners}
          layoutMode={wizard.layoutMode}
          onLayoutModeChange={wizard.setLayoutMode}
          preferences={wizard.preferences}
          userRatings={wizard.userRatings}
          onUpdatePreference={wizard.updatePreference}
          onClearPreference={wizard.clearPreference}
          onReorderPreferences={wizard.reorderPreferences}
        />
      )
    case 3:
      return (
        <ResultStep
          topPick={wizard.recommendation.topPick}
          alternatives={wizard.recommendation.alternatives}
          vetoed={wizard.recommendation.vetoed}
          filters={wizard.filters}
          users={wizard.users}
          gameOwners={wizard.gameOwners}
          layoutMode={wizard.layoutMode}
          onLayoutModeChange={wizard.setLayoutMode}
          onPromoteAlternative={wizard.promoteAlternativeToTopPick}
          onSaveNight={onOpenSaveDialog}
        />
      )
    default:
      return null
  }
}
