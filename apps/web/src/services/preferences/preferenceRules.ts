import type { UserPreferenceRecord } from '../../db/types'

export type PreferenceUpdate = {
  rank?: number
  isTopPick?: boolean
  isDisliked?: boolean
}

export function normalizePreferenceUpdate(
  existing: Pick<UserPreferenceRecord, 'rank' | 'isTopPick' | 'isDisliked'> | undefined,
  update: PreferenceUpdate,
): Pick<UserPreferenceRecord, 'rank' | 'isTopPick' | 'isDisliked'> {
  // Exclusivity rules (explicit updates win over existing state):
  // - Disliked => clears top-pick and rank
  // - Top-pick => clears rank
  // - Rank set => clears disliked and top-pick

  if (update.isDisliked === true) {
    return { rank: undefined, isTopPick: false, isDisliked: true }
  }

  if (update.isTopPick === true) {
    return { rank: undefined, isTopPick: true, isDisliked: false }
  }

  if (update.rank !== undefined) {
    return { rank: update.rank, isTopPick: false, isDisliked: false }
  }

  const nextRank = update.rank ?? existing?.rank
  const nextTopPick = update.isTopPick ?? existing?.isTopPick ?? false
  const nextDisliked = update.isDisliked ?? existing?.isDisliked ?? false

  if (nextDisliked) return { rank: undefined, isTopPick: false, isDisliked: true }
  if (nextTopPick) return { rank: undefined, isTopPick: true, isDisliked: false }
  if (nextRank !== undefined) return { rank: nextRank, isTopPick: false, isDisliked: false }
  return { rank: undefined, isTopPick: false, isDisliked: false }
}
