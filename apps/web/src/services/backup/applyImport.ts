import { db } from '../../db'
import type { ParsedTables } from './parseTables'

export async function applyReplace(payload: ParsedTables) {
  await db.transaction('rw', db.games, db.gameNotes, db.users, db.userGames, db.userPreferences, db.wizardState, db.savedNights, async () => {
    await Promise.all([
      db.games.clear(),
      db.gameNotes.clear(),
      db.users.clear(),
      db.userGames.clear(),
      db.userPreferences.clear(),
      db.wizardState.clear(),
      db.savedNights.clear(),
    ])
    await Promise.all([
      db.games.bulkAdd(payload.games),
      db.gameNotes.bulkAdd(payload.gameNotes),
      db.users.bulkAdd(payload.users),
      db.userGames.bulkAdd(payload.userGames),
      db.userPreferences.bulkAdd(payload.userPreferences),
      payload.wizardState ? db.wizardState.put(payload.wizardState) : Promise.resolve(),
      db.savedNights.bulkAdd(payload.savedNights),
    ])
  })
}

export async function applyMerge(payload: ParsedTables) {
  await db.transaction('rw', db.games, db.gameNotes, db.users, db.userGames, db.userPreferences, db.wizardState, db.savedNights, async () => {
    for (const g of payload.games) {
      const existing = await db.games.get(g.bggId)
      if (!existing || (existing.lastFetchedAt ?? '') < (g.lastFetchedAt ?? '')) await db.games.put(g)
    }

    if (payload.gameNotes.length) await db.gameNotes.bulkPut(payload.gameNotes.map((n) => ({ ...n, id: n.id ?? undefined })))

    for (const u of payload.users) {
      const existing = await db.users.get(u.username)
      if (!existing) {
        await db.users.put(u)
      } else {
        const keepImported = (existing.lastSyncAt ?? '') < (u.lastSyncAt ?? '')
        await db.users.put({ ...existing, ...(keepImported ? u : {}), lastSyncAt: keepImported ? u.lastSyncAt : existing.lastSyncAt })
      }
    }

    for (const ug of payload.userGames) {
      const existing = await db.userGames.where({ username: ug.username, bggId: ug.bggId }).first()
      if (!existing) {
        await db.userGames.add(ug)
      } else {
        const keepImported = (existing.addedAt ?? '') < (ug.addedAt ?? '') || (existing.rating === undefined && ug.rating !== undefined)
        if (keepImported) await db.userGames.update(existing.id!, { ...existing, ...ug })
      }
    }

    for (const up of payload.userPreferences) {
      const existing = await db.userPreferences.where({ username: up.username, bggId: up.bggId }).first()
      if (!existing) {
        await db.userPreferences.add(up)
      } else if ((existing.updatedAt ?? '') < (up.updatedAt ?? '')) {
        await db.userPreferences.update(existing.id!, up)
      }
    }

    if (payload.wizardState) {
      const existing = await db.wizardState.get('singleton')
      if (!existing || (existing.updatedAt ?? '') < (payload.wizardState.updatedAt ?? '')) await db.wizardState.put(payload.wizardState)
    }

    if (payload.savedNights.length) await db.savedNights.bulkPut(payload.savedNights.map((n) => ({ ...n, id: undefined })))
  })
}
