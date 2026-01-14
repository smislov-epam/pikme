import type { SavedNightRecord } from '../../db/types'

export function findReusableNight(params: {
  savedNights: SavedNightRecord[]
  organizerUsername: string | null
  playerCount: number
}): SavedNightRecord | null {
  const { savedNights, organizerUsername, playerCount } = params
  if (!organizerUsername) return null
  if (!Number.isFinite(playerCount) || playerCount <= 0) return null

  const candidates = savedNights.filter((n) => {
    const usernames = n.data.usernames ?? []
    const gameIds = n.data.gameIds ?? []
    return (
      n.data.organizerUsername === organizerUsername &&
      usernames.length === playerCount &&
      gameIds.length > 0
    )
  })

  if (candidates.length === 0) return null

  return candidates
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null
}
