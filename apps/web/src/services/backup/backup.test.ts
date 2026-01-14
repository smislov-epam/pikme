import { describe, expect, it, beforeEach } from 'vitest'
import { unzipSync } from 'fflate'
import { db, clearAllData } from '../../db/db'
import { exportBackupZip, importBackup } from './'

const now = '2024-01-01T00:00:00.000Z'

async function seedBasic() {
  await db.games.add({ bggId: 1, name: 'Alpha', lastFetchedAt: now })
  await db.users.add({ username: 'u1', isBggUser: false })
  await db.userGames.add({ username: 'u1', bggId: 1, source: 'manual', addedAt: now })
  await db.userPreferences.add({ username: 'u1', bggId: 1, isTopPick: true, isDisliked: false, updatedAt: now })
  await db.savedNights.add({ createdAt: now, data: { name: 'Night', usernames: ['u1'], gameIds: [1], filters: {}, pick: { bggId: 1, name: 'Alpha', score: 1 }, alternatives: [] } })
  await db.gameNotes.add({ bggId: 1, text: 'note', createdAt: now })
}

describe('backup export/import', () => {
  beforeEach(async () => {
    await clearAllData()
  })

  it('exports and imports backup in replace mode', async () => {
    await seedBasic()
    const exported = await exportBackupZip()
    const zipBlob = exported.blob
    const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()))
    expect(Object.keys(unzipped)).toContain('pikme-backup.json')

    await clearAllData()
    await importBackup({ files: zipBlob, mode: 'replace' })

    expect(await db.games.count()).toBe(1)
    expect(await db.users.count()).toBe(1)
    expect(await db.userGames.count()).toBe(1)
    expect(await db.userPreferences.count()).toBe(1)
    expect(await db.savedNights.count()).toBe(1)
    expect(await db.gameNotes.count()).toBe(1)
  })

  it('merge keeps newer game data', async () => {
    await seedBasic()
    const exported = await exportBackupZip()
    const zipBlob = exported.blob
    const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()))
    expect(Object.keys(unzipped)).toContain('pikme-backup.json')

    await db.games.put({ bggId: 1, name: 'Alpha new', lastFetchedAt: '2025-01-01T00:00:00.000Z' })

    await importBackup({ files: zipBlob, mode: 'merge' })

    const game = await db.games.get(1)
    expect(game?.name).toBe('Alpha new')
    expect(game?.lastFetchedAt).toBe('2025-01-01T00:00:00.000Z')
  })
})
