import { db } from '../../db'
import type { SavedNightData, SavedNightRecord } from '../../db/types'

export async function saveNight(
  data: SavedNightData,
): Promise<SavedNightRecord> {
  const record: SavedNightRecord = {
    createdAt: new Date().toISOString(),
    data,
  }

  const id = await db.savedNights.add(record)
  return { ...record, id: id as number }
}

export async function getSavedNights(
  limit?: number,
): Promise<SavedNightRecord[]> {
  let query = db.savedNights.orderBy('createdAt').reverse()

  if (limit !== undefined) {
    query = query.limit(limit)
  }

  return query.toArray()
}

export async function getSavedNight(
  id: number,
): Promise<SavedNightRecord | undefined> {
  return db.savedNights.get(id)
}

export async function deleteSavedNight(id: number): Promise<void> {
  await db.savedNights.delete(id)
}

export async function clearAllSavedNights(): Promise<void> {
  await db.savedNights.clear()
}
