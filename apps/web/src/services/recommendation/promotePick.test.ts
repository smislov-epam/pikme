import { promotePickInSortedGames } from './promotePick'

type GameWithScore = {
  game: { bggId: number; name: string; lastFetchedAt: string }
  score: number
  matchReasons: string[]
}

function g(id: number): GameWithScore {
  return { game: { bggId: id, name: `g${id}`, lastFetchedAt: new Date().toISOString() }, score: id, matchReasons: [] }
}

describe('promotePickInSortedGames', () => {
  it('returns same order when no promoted id', () => {
    const sorted = [g(1), g(2), g(3)]
    expect(promotePickInSortedGames(sorted, null)).toEqual(sorted)
  })

  it('moves promoted game to the front while preserving others order', () => {
    const sorted = [g(10), g(20), g(30), g(40)]
    expect(promotePickInSortedGames(sorted, 30).map((x) => x.game.bggId)).toEqual([30, 10, 20, 40])
  })
})
