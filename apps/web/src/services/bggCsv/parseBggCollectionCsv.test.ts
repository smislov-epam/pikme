import { describe, expect, it } from 'vitest'
import { parseBggCollectionCsv } from './parseBggCollectionCsv'

const csv = `objectname,objectid,own,objecttype,rating,minplayers,maxplayers,playingtime,yearpublished,bggbestplayers,comment,acquisitiondate
Catan,13,1,boardgame,8,3,4,90,1995,4,Great copy,2020-01-02
Catan: 5-6 Player Extension,14,1,boardgameexpansion,,3,6,90,1996,6,,
Some Played Game,15,0,boardgame,7,2,4,60,2010,2,,
Broken,,1,boardgame,7,2,4,60,2010,2,,
`

describe('parseBggCollectionCsv', () => {
  it('filters own=1 and excludes expansions', () => {
    const parsed = parseBggCollectionCsv(csv)
    expect(parsed.stats.totalRows).toBe(4)
    expect(parsed.stats.ownedRows).toBe(2)
    expect(parsed.stats.skippedNotOwned).toBe(1)
    expect(parsed.stats.skippedExpansions).toBe(1)
    expect(parsed.stats.importedCandidates).toBe(1)

    expect(parsed.rows).toHaveLength(1)
    expect(parsed.rows[0]).toMatchObject({
      bggId: 13,
      name: 'Catan',
      bestWith: '4',
      minPlayers: 3,
      maxPlayers: 4,
      playingTimeMinutes: 90,
      yearPublished: 1995,
      rating: 8,
    })

    expect(parsed.errors.length).toBe(1)
  })
})
