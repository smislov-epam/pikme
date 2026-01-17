/**
 * Recommendation computation using Normalized Borda Count scoring.
 * 
 * This pure function computes game recommendations based on user preferences.
 * It handles veto (dislike) logic, top-pick bonuses, and ranking scores.
 * 
 * ## Scoring Algorithm
 * 
 * 1. **Veto check**: Any user marking a game as "disliked" removes it from consideration
 * 2. **Normalized Borda count**: Each user's contribution is normalized to 0-1 scale:
 *    - Rank 1 = 1.0 points, last rank = 0.0 points
 *    - Formula: (m - 1 - index) / (m - 1) where m = number of ranked games
 *    - This ensures all users contribute equally regardless of how many games they rank
 * 3. **Top-pick bonus**: Games marked as top picks get +0.5 bonus points (50% of max)
 * 4. **Tie-breaking**: Games with equal scores maintain their relative order
 * 
 * ## Usage
 * 
 * ```ts
 * const result = computeRecommendation({
 *   games: filteredGames,
 *   preferences,
 *   filters,
 *   users,
 *   promotedPickBggId: null,
 * })
 * ```
 */
import type { GameRecord, UserPreferenceRecord } from '../../db/types'
import type { WizardFilters } from '../../store/wizardTypes'
import type { RecommendationResult, VetoedGame } from '../../hooks/wizard/types'
import { isCoopGame } from '../filtering/filterConstants'
import { promotePickInSortedGames } from './promotePick'

/** Bonus points for games marked as top picks (0.5 = 50% of max normalized score) */
const TOP_PICK_BONUS = 0.5

/** Number of alternative games to include in results */
const MAX_ALTERNATIVES = 5

export interface ComputeRecommendationInput {
  /** Games to consider (already filtered) */
  games: GameRecord[]
  /** User preferences keyed by username */
  preferences: Record<string, UserPreferenceRecord[]>
  /** Current filter settings (for match reasons) */
  filters: WizardFilters
  /** Users in the session (for validation) */
  users: { username: string }[]
  /** Optional: override top pick with this game's bggId */
  promotedPickBggId: number | null
}

/**
 * Compute game recommendations using Borda count with veto logic.
 */
export function computeRecommendation(input: ComputeRecommendationInput): RecommendationResult {
  const { games, preferences, filters, users, promotedPickBggId } = input

  // Early return for empty inputs
  if (games.length === 0 || users.length === 0) {
    return { topPick: null, alternatives: [], vetoed: [] }
  }

  // Step 1: Identify vetoed games (disliked by any user)
  const { vetoedGames, eligibleGames } = separateVetoedGames(games, preferences)

  if (eligibleGames.length === 0) {
    return { topPick: null, alternatives: [], vetoed: vetoedGames }
  }

  // Step 2: Calculate Borda scores
  const scores = calculateBordaScores(eligibleGames, preferences)

  // Step 3: Sort by score and add match reasons
  const sortedGames = eligibleGames
    .map((game) => ({
      game,
      score: scores[game.bggId] ?? 0,
      matchReasons: getMatchReasons(game, filters),
    }))
    .sort((a, b) => b.score - a.score)

  // Step 4: Handle promoted pick override
  const finalSortedGames = promotePickInSortedGames(sortedGames, promotedPickBggId)

  return {
    topPick: finalSortedGames[0] ?? null,
    alternatives: finalSortedGames.slice(1, MAX_ALTERNATIVES + 1),
    vetoed: vetoedGames,
  }
}

/**
 * Separate games into vetoed and eligible lists.
 */
function separateVetoedGames(
  games: GameRecord[],
  preferences: Record<string, UserPreferenceRecord[]>,
): { vetoedGames: VetoedGame[]; eligibleGames: GameRecord[] } {
  const eligibleIds = new Set(games.map((g) => g.bggId))
  const vetoedByGame: Record<number, string[]> = {}

  // Find all games vetoed by any user
  for (const username of Object.keys(preferences)) {
    const userPrefs = preferences[username] ?? []
    for (const pref of userPrefs) {
      if (!pref.isDisliked) continue
      if (!eligibleIds.has(pref.bggId)) continue
      ;(vetoedByGame[pref.bggId] ||= []).push(username)
    }
  }

  const vetoedIds = new Set(Object.keys(vetoedByGame).map((k) => Number(k)))

  const vetoedGames = games
    .filter((g) => vetoedIds.has(g.bggId))
    .map((game) => ({ game, vetoedBy: vetoedByGame[game.bggId] ?? [] }))

  const eligibleGames = games.filter((g) => !vetoedIds.has(g.bggId))

  return { vetoedGames, eligibleGames }
}

/**
 * Calculate Normalized Borda count scores for eligible games.
 * Each user's contribution is normalized to 0-1 scale so all users
 * have equal influence regardless of how many games they rank.
 */
function calculateBordaScores(
  games: GameRecord[],
  preferences: Record<string, UserPreferenceRecord[]>,
): Record<number, number> {
  const scores: Record<number, number> = {}

  // Initialize all scores to 0
  for (const game of games) {
    scores[game.bggId] = 0
  }

  // Calculate scores from each user's preferences
  for (const username of Object.keys(preferences)) {
    const userPrefs = preferences[username] ?? []

    // Get ranked preferences for eligible games
    const rankedPrefs = userPrefs
      .filter((p) => scores[p.bggId] !== undefined)
      .filter((p) => p.rank !== undefined || p.isTopPick)
      .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))

    const m = rankedPrefs.length

    // Apply Normalized Borda count:
    // - Rank 1 gets 1.0, last rank gets 0.0
    // - Formula: (m - 1 - index) / (m - 1)
    // - When m = 1, the single ranked game gets 1.0 points
    rankedPrefs.forEach((pref, index) => {
      if (scores[pref.bggId] !== undefined) {
        // Normalized score: 1.0 for rank 1, 0.0 for last rank
        const normalizedScore = m > 1 ? (m - 1 - index) / (m - 1) : 1.0
        scores[pref.bggId] += normalizedScore

        // Bonus for top picks (0.5 = 50% of max normalized score)
        if (pref.isTopPick) {
          scores[pref.bggId] += TOP_PICK_BONUS
        }
      }
    })
  }

  return scores
}

/**
 * Generate human-readable match reasons for a game.
 */
export function getMatchReasons(game: GameRecord, filters: WizardFilters): string[] {
  const reasons: string[] = []

  // Player count match
  if (game.minPlayers && game.maxPlayers) {
    if (filters.playerCount >= game.minPlayers && filters.playerCount <= game.maxPlayers) {
      reasons.push(`✓ ${filters.playerCount} players`)
    }
  }

  // Play time category
  if (game.playingTimeMinutes) {
    if (game.playingTimeMinutes <= 30) {
      reasons.push('Quick game')
    } else if (game.playingTimeMinutes <= 60) {
      reasons.push('Medium length')
    } else {
      reasons.push('Epic session')
    }
  }

  // Game mode match
  if (filters.mode !== 'any') {
    const isCoop = isCoopGame(game.mechanics)
    if (filters.mode === 'coop' && isCoop) {
      reasons.push('🤝 Cooperative')
    }
    if (filters.mode === 'competitive' && !isCoop) {
      reasons.push('⚔️ Competitive')
    }
  }

  return reasons
}
