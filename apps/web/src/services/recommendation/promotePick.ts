import type { GameWithScore } from '../../components/steps/ResultStep'

export function promotePickInSortedGames(
  sorted: GameWithScore[],
  promotedBggId: number | null,
): GameWithScore[] {
  if (!promotedBggId) return sorted
  const index = sorted.findIndex((g) => g.game.bggId === promotedBggId)
  if (index <= 0) return sorted

  return [sorted[index], ...sorted.slice(0, index), ...sorted.slice(index + 1)]
}
