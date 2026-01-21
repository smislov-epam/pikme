import type { WizardActions, WizardState } from '../../hooks/useWizardState'
import { computeRecommendation } from '../../services/recommendation/computeRecommendation'

export function getWizardViewForSession(args: {
  wizard: WizardState & WizardActions
  activeSessionId: string | null
  mergedUsers: WizardState['users']
  mergedPreferences: WizardState['preferences']
}): WizardState & WizardActions {
  const { wizard, activeSessionId, mergedUsers, mergedPreferences } = args

  if (!activeSessionId) return wizard

  return {
    ...wizard,
    users: mergedUsers,
    preferences: mergedPreferences,
    recommendation: computeRecommendation({
      games: wizard.filteredGames,
      preferences: mergedPreferences,
      users: mergedUsers,
      filters: wizard.filters,
      promotedPickBggId: wizard.promotedPickBggId,
    }),
  }
}
