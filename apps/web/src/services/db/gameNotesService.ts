import { db } from '../../db/db'
import type { GameNoteRecord } from '../../db/types'

export async function listGameNotes(bggId: number): Promise<GameNoteRecord[]> {
  return db.gameNotes.where('bggId').equals(bggId).reverse().sortBy('createdAt')
}

export async function addGameNote(bggId: number, text: string): Promise<GameNoteRecord> {
  const trimmed = text.trim()
  if (!trimmed) {
    throw new Error('Note cannot be empty')
  }

  const note: GameNoteRecord = {
    bggId,
    text: trimmed,
    createdAt: new Date().toISOString(),
  }

  const id = await db.gameNotes.add(note)
  return { ...note, id }
}

export async function deleteGameNote(id: number): Promise<void> {
  await db.gameNotes.delete(id)
}

export async function clearGameNotes(bggId: number): Promise<void> {
  await db.gameNotes.where('bggId').equals(bggId).delete()
}
