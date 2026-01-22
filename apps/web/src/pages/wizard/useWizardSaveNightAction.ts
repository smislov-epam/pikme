import { useCallback } from 'react'
import type { WizardActions, WizardState } from '../../hooks/useWizardState'
import { trackGameNightSaved } from '../../services/analytics/googleAnalytics'
import type { ToastApi } from '../../services/toast'
import * as dbService from '../../services/db'

export function useWizardSaveNightAction(args: {
  wizard: WizardState & WizardActions
  toast: ToastApi
  activeSessionId: string | null
  onSaved?: () => void
}) {
  const { wizard, toast, activeSessionId, onSaved } = args

  return useCallback(
    async (name: string, description?: string, includeGuestUsernames?: string[]) => {
      try {
        const topPick = wizard.recommendation.topPick
        if (!topPick) return

        // Persist the night using the currently rendered wizard view.
        // This matters in session mode where the UI shows merged preferences/users.
        const excludedSet = new Set(wizard.excludedBggIds)
        const orgUsername = wizard.users.find((u) => u.isOrganizer)?.username
        const includeGuestSet = new Set(includeGuestUsernames ?? [])
        const usernamesToSave = wizard.users
          .filter((u) => !u.username.startsWith('__guest_') || includeGuestSet.has(u.username))
          .map((u) => u.username)

        await dbService.saveNight({
          name,
          description,
          organizerUsername: orgUsername,
          usernames: usernamesToSave,
          gameIds: wizard.sessionGameIds.filter((id) => !excludedSet.has(id)),
          filters: {
            playerCount: wizard.filters.playerCount,
            timeRange: wizard.filters.timeRange,
            mode: wizard.filters.mode,
            excludeLowRatedThreshold: wizard.filters.excludeLowRatedThreshold ?? undefined,
            ageRange: wizard.filters.ageRange,
            complexityRange: wizard.filters.complexityRange,
            ratingRange: wizard.filters.ratingRange,
          },
          pick: {
            bggId: topPick.game.bggId,
            name: topPick.game.name,
            score: topPick.score,
          },
          alternatives: wizard.recommendation.alternatives.map((a) => ({
            bggId: a.game.bggId,
            name: a.game.name,
            score: a.score,
          })),
        })

        await wizard.loadSavedNights()

        if (activeSessionId) {
          try {
            const { setSessionSelectedGame } = await import('../../services/session')
            await setSessionSelectedGame(activeSessionId, {
              gameId: String(topPick.game.bggId),
              name: topPick.game.name,
              thumbnail: topPick.game.thumbnail ?? null,
              image: topPick.game.image ?? null,
              score: topPick.score,
              minPlayers: topPick.game.minPlayers ?? null,
              maxPlayers: topPick.game.maxPlayers ?? null,
              playingTimeMinutes: topPick.game.playingTimeMinutes ?? null,
            })
          } catch (err) {
            console.warn('[WizardPage] Failed to set session selected game:', err)
          }
        }

        toast.success('Game night saved')
        trackGameNightSaved({
          playerCount: wizard.users.length,
          sessionGames: wizard.sessionGameIds.length,
          topPickName: wizard.recommendation.topPick?.game.name,
          hasDescription: Boolean(description),
        })

        onSaved?.()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save game night')
        throw err
      }
    },
    [activeSessionId, onSaved, toast, wizard]
  )
}
