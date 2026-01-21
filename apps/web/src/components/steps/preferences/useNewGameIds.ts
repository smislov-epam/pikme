import { useEffect, useMemo, useState } from 'react'
import { db } from '../../../db'

function toMillis(iso?: string): number | null {
  if (!iso) return null
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : null
}

export function useNewGameIds(params: {
  username: string
  gameIds: number[]
  lastPreferencesReviewedAt?: string
}) {
  const { username, gameIds, lastPreferencesReviewedAt } = params

  const [newGameIds, setNewGameIds] = useState<Set<number>>(() => new Set())
  const [isLoading, setIsLoading] = useState(false)

  // Stable key so we don't refire on every render when parent passes a new array instance
  const gameIdsKey = useMemo(() => gameIds.join(','), [gameIds])

  // eslint-disable-next-line react-hooks/exhaustive-deps -- gameIdsKey is a stable derivative of gameIds
  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!username || gameIds.length === 0) {
        setNewGameIds(new Set())
        return
      }

      setIsLoading(true)
      try {
        const reviewedAtMs = toMillis(lastPreferencesReviewedAt)
        const userGames = await db.userGames.where('username').equals(username).toArray()

        const next = new Set<number>()
        const gameIdSet = new Set(gameIds)
        for (const ug of userGames) {
          if (!gameIdSet.has(ug.bggId)) continue

          if (reviewedAtMs == null) {
            next.add(ug.bggId)
            continue
          }

          const addedAtMs = toMillis(ug.addedAt)
          if (addedAtMs != null && addedAtMs > reviewedAtMs) {
            next.add(ug.bggId)
          }
        }

        if (!cancelled) setNewGameIds(next)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [gameIdsKey, lastPreferencesReviewedAt, username])

  return { newGameIds, isLoading }
}
