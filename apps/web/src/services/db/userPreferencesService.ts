import { db } from '../../db'
import type { UserPreferenceRecord } from '../../db/types'

export interface UserPreferenceInput {
  bggId: number
  rank?: number
  isTopPick?: boolean
  isDisliked?: boolean
}

function normalizePreferenceInput(input: UserPreferenceInput): Required<Pick<UserPreferenceInput, 'bggId'>> & {
  rank?: number
  isTopPick: boolean
  isDisliked: boolean
} {
  const isDisliked = input.isDisliked ?? false
  const isTopPick = input.isTopPick ?? false

  // Exclusivity rules:
  // - Disliked implies not top-pick and no rank
  // - Top-pick implies no rank
  // - Rank implies not disliked and not top-pick
  if (isDisliked) {
    return { bggId: input.bggId, isDisliked: true, isTopPick: false }
  }

  if (isTopPick) {
    return { bggId: input.bggId, isDisliked: false, isTopPick: true }
  }

  if (input.rank !== undefined) {
    return { bggId: input.bggId, rank: input.rank, isDisliked: false, isTopPick: false }
  }

  return { bggId: input.bggId, isDisliked: false, isTopPick: false }
}

export async function getUserPreferences(
  username: string,
): Promise<UserPreferenceRecord[]> {
  return db.userPreferences.where('username').equals(username).toArray()
}

export async function getUserPreference(
  username: string,
  bggId: number,
): Promise<UserPreferenceRecord | undefined> {
  return db.userPreferences
    .where('[username+bggId]')
    .equals([username, bggId])
    .first()
}

export async function saveUserPreferences(
  username: string,
  preferences: UserPreferenceInput[],
): Promise<void> {
  const now = new Date().toISOString()

  await db.transaction('rw', db.userPreferences, async () => {
    // Clear existing preferences for this user
    await db.userPreferences.where('username').equals(username).delete()

    // Add new preferences
    const records: UserPreferenceRecord[] = preferences.map((pref) => {
      const normalized = normalizePreferenceInput(pref)
      return {
        username,
        bggId: normalized.bggId,
        rank: normalized.rank,
        isTopPick: normalized.isTopPick,
        isDisliked: normalized.isDisliked,
        updatedAt: now,
      }
    })

    await db.userPreferences.bulkAdd(records)
  })
}

export async function updateGamePreference(
  username: string,
  bggId: number,
  update: Partial<UserPreferenceInput>,
): Promise<void> {
  const now = new Date().toISOString()

  const existing = await db.userPreferences
    .where('[username+bggId]')
    .equals([username, bggId])
    .first()

  const merged: UserPreferenceInput = {
    bggId,
    rank: update.rank ?? existing?.rank,
    isTopPick: update.isTopPick ?? existing?.isTopPick,
    isDisliked: update.isDisliked ?? existing?.isDisliked,
  }

  const normalized = normalizePreferenceInput(merged)

  if (existing?.id) {
    await db.userPreferences.update(existing.id, {
      rank: normalized.rank,
      isTopPick: normalized.isTopPick,
      isDisliked: normalized.isDisliked,
      updatedAt: now,
    })
  } else {
    await db.userPreferences.add({
      username,
      bggId,
      rank: normalized.rank,
      isTopPick: normalized.isTopPick,
      isDisliked: normalized.isDisliked,
      updatedAt: now,
    })
  }
}

export async function clearUserPreferences(username: string): Promise<void> {
  await db.userPreferences.where('username').equals(username).delete()
}

export async function deleteUserPreference(
  username: string,
  bggId: number,
): Promise<void> {
  await db.userPreferences
    .where('[username+bggId]')
    .equals([username, bggId])
    .delete()
}

export async function getTopPicks(
  username: string,
): Promise<UserPreferenceRecord[]> {
  return db.userPreferences
    .where('username')
    .equals(username)
    .and((pref) => pref.isTopPick && !pref.isDisliked)
    .toArray()
}

export async function getRankedGames(
  username: string,
): Promise<UserPreferenceRecord[]> {
  const prefs = await db.userPreferences
    .where('username')
    .equals(username)
    .and((pref) => pref.rank !== undefined && !pref.isDisliked)
    .toArray()

  return prefs.sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))
}

/**
 * Update ranks for the provided ordered list, preserving isTopPick/isDisliked flags.
 * - Any game in orderedBggIds gets rank = index+1.
 * - Any existing ranked game not in orderedBggIds has its rank cleared.
 */
export async function setUserPreferenceRanks(
  username: string,
  orderedBggIds: number[],
): Promise<void> {
  const now = new Date().toISOString()

  await db.transaction('rw', db.userPreferences, async () => {
    const existing = await db.userPreferences.where('username').equals(username).toArray()
    const existingById = new Map(existing.map((p) => [p.bggId, p]))

    const updates: UserPreferenceRecord[] = []

    // Clear ranks for previously-ranked items not in ordered list
    const orderedSet = new Set(orderedBggIds)
    for (const pref of existing) {
      if (pref.rank !== undefined && !orderedSet.has(pref.bggId)) {
        updates.push({
          ...pref,
          rank: undefined,
          updatedAt: now,
          isTopPick: pref.isTopPick ?? false,
          isDisliked: pref.isDisliked ?? false,
        })
      }
    }

    // Apply new ranks (ranking implies not top-pick and not disliked)
    orderedBggIds.forEach((bggId, index) => {
      const prev = existingById.get(bggId)
      updates.push({
        id: prev?.id,
        username,
        bggId,
        rank: index + 1,
        isTopPick: false,
        isDisliked: false,
        updatedAt: now,
      })
    })

    // Use bulkPut so existing IDs are updated and new ones are inserted.
    await db.userPreferences.bulkPut(updates)
  })
}

export async function hasExistingPreferences(
  username: string,
): Promise<boolean> {
  const count = await db.userPreferences
    .where('username')
    .equals(username)
    .count()

  return count > 0
}
