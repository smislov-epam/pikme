import { useCallback } from 'react'
import type { WizardActions, WizardState } from '../../hooks/useWizardState'
import { trackGameNightSaved } from '../../services/analytics/googleAnalytics'
import type { ToastApi } from '../../services/toast'

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
        await wizard.saveNight(name, description, includeGuestUsernames)

        if (activeSessionId && wizard.recommendation.topPick) {
          try {
            const { setSessionSelectedGame } = await import('../../services/session')
            const topPick = wizard.recommendation.topPick
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
