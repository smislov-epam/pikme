import type { WizardFilters } from '../../store/wizardTypes'
import type { SessionWizardState } from './wizardStateStorage'

type PreferenceLike = {
  bggId: number
  rank?: number | null
  isTopPick: boolean
  isDisliked: boolean
}

export function buildSessionWizardStateSnapshot(args: {
  users: Array<{ username: string }>
  sessionGameIds: number[]
  excludedBggIds: number[]
  filters: WizardFilters
  preferences: Record<string, PreferenceLike[]>
  activeStep: number
}): SessionWizardState {
  const { users, sessionGameIds, excludedBggIds, filters, preferences, activeStep } = args

  return {
    usernames: users.map((u) => u.username),
    sessionGameIds,
    excludedBggIds,
    filters,
    preferences: Object.fromEntries(
      Object.entries(preferences).map(([username, prefs]) => [
        username,
        prefs.map((p) => ({
          bggId: p.bggId,
          // Preserve undefined ranks. JSON.stringify omits undefined fields,
          // which is what we want for neutral (unranked) preferences.
          rank: p.rank ?? undefined,
          isTopPick: p.isTopPick,
          isDisliked: p.isDisliked,
        })),
      ])
    ),
    activeStep,
    savedAt: new Date().toISOString(),
  }
}
