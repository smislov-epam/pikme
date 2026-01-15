import { beforeEach, describe, expect, it } from 'vitest'
import { clearAllData, db } from '../../db/db'
import { importBggCollectionCsv } from './importBggCollectionCsv'

function fileFromString(name: string, content: string): File {
  // Vitest/jsdom File may not implement .text(); importer relies on it.
  return {
    name,
    size: new TextEncoder().encode(content).byteLength,
    type: 'text/csv',
    text: async () => content,
  } as unknown as File
}

const csv = `objectname,objectid,own,objecttype,rating,minplayers,maxplayers,playingtime,yearpublished,bggbestplayers,comment,acquisitiondate
Catan,13,1,boardgame,8,3,4,90,1995,4,Great copy,2020-01-02
Carcassonne,822,1,boardgame,,2,5,45,2000,2,,
`

describe('importBggCollectionCsv', () => {
  beforeEach(async () => {
    await clearAllData()
  })

  it('imports games + ownership for a user without network calls', async () => {
    const res = await importBggCollectionCsv({
      file: fileFromString('bgg.csv', csv),
      username: 'alice',
    })

    expect(res.username).toBe('alice')
    expect(res.imported).toBe(2)

    const user = await db.users.get('alice')
    expect(user?.isBggUser).toBe(true)

    expect(await db.games.count()).toBe(2)
    expect(await db.userGames.count()).toBe(2)

    const game = await db.games.get(13)
    expect(game?.bestWith).toBe('4')

    const ug = await db.userGames.where('[username+bggId]').equals(['alice', 13]).first()
    expect(ug?.rating).toBe(8)

    const notes = await db.gameNotes.where('bggId').equals(13).toArray()
    expect(notes.length).toBe(1)
    expect(notes[0]?.text).toBe('Great copy')
  })

  it('merge keeps existing richer fields and preserves rating if CSV empty', async () => {
    // Existing richer game data
    await db.games.put({ bggId: 822, name: 'Carcassonne', thumbnail: 't.png', lastFetchedAt: '2025-01-01T00:00:00.000Z' })
    await db.users.put({ username: 'alice', internalId: 'alice-1', isBggUser: true })
    await db.userGames.add({ username: 'alice', bggId: 822, rating: 6, source: 'manual', addedAt: '2024-01-01T00:00:00.000Z' })

    await importBggCollectionCsv({
      file: fileFromString('bgg.csv', csv),
      username: 'alice',
    })

    const merged = await db.games.get(822)
    expect(merged?.thumbnail).toBe('t.png')
    expect(merged?.lastFetchedAt).toBeTruthy()
    expect(new Date(merged!.lastFetchedAt).getTime()).toBeGreaterThan(new Date('2025-01-01T00:00:00.000Z').getTime())

    const ug = await db.userGames.where('[username+bggId]').equals(['alice', 822]).first()
    expect(ug?.rating).toBe(6)
    expect(ug?.source).toBe('manual')
  })
})
