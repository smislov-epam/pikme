import type { GameRecord } from '../../db/types'
import type { WizardFilters } from '../../store/wizardTypes'

const COOP_MECHANICS = ['Cooperative Game', 'Solo / Solitaire Game', 'Team-Based Game']

function isCoopGame(mechanics?: string[]): boolean {
  if (!mechanics) return false
  return mechanics.some((m) => COOP_MECHANICS.includes(m))
}

function bestWithMatchesPlayerCount(bestWith: string, playerCount: number): boolean {
  const normalized = bestWith
    .replace(/best\s*with/gi, '')
    .replace(/players?/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!normalized) return false

  const parts = normalized.split(',').map((p) => p.trim()).filter(Boolean)
  const chunks = parts.length ? parts : [normalized]

  for (const chunk of chunks) {
    const hasRange = chunk.includes('-') || chunk.includes('–')
    const nums = chunk.match(/\d+/g)?.map((n) => Number(n)).filter((n) => Number.isFinite(n)) ?? []
    if (!nums.length) continue

    if (hasRange && nums.length >= 2) {
      const min = Math.min(nums[0], nums[1])
      const max = Math.max(nums[0], nums[1])
      if (playerCount >= min && playerCount <= max) return true
      continue
    }

    if (nums.includes(playerCount)) return true
  }

  return false
}

export function applyGameFilters(
  games: GameRecord[],
  filters: WizardFilters,
  userRatings: Record<string, Record<number, number | undefined>>,
): GameRecord[] {
  return games.filter((game) => {
    // Player count
    const minPlayers = game.minPlayers ?? 1
    const maxPlayers = game.maxPlayers ?? 99
    if (filters.playerCount < minPlayers || filters.playerCount > maxPlayers) return false

    // Best-with refinement
    if (filters.requireBestWithPlayerCount) {
      if (!game.bestWith) return false
      if (!bestWithMatchesPlayerCount(game.bestWith, filters.playerCount)) return false
    }

    // Time range
    const time = game.playingTimeMinutes
    if (time !== undefined) {
      if (time < filters.timeRange.min || time > filters.timeRange.max) return false
    }

    // Mode
    if (filters.mode !== 'any') {
      const coop = isCoopGame(game.mechanics)
      if (filters.mode === 'coop' && !coop) return false
      if (filters.mode === 'competitive' && coop) return false
    }

    // Age range (allow unknown)
    if (game.minAge !== undefined) {
      if (game.minAge < filters.ageRange.min || game.minAge > filters.ageRange.max) return false
    }

    // Complexity range (allow unknown)
    if (game.weight !== undefined) {
      if (game.weight < filters.complexityRange.min || game.weight > filters.complexityRange.max) return false
    }

    // Rating range (allow unknown)
    if (game.averageRating !== undefined) {
      if (game.averageRating < filters.ratingRange.min || game.averageRating > filters.ratingRange.max) return false
    }

    // Low rated exclusion (by any player)
    if (filters.excludeLowRatedThreshold !== null) {
      for (const username of Object.keys(userRatings)) {
        const rating = userRatings[username][game.bggId]
        if (rating !== undefined && rating < filters.excludeLowRatedThreshold) return false
      }
    }

    return true
  })
}
