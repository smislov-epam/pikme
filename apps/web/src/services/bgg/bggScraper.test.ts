import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('./bggClient', () => ({
  fetchQueuedXml: vi.fn(),
  hasBggApiKey: vi.fn(),
}))

import { fetchQueuedXml, hasBggApiKey } from './bggClient'
import { extractBggIdFromUrl, isValidBggUrl, toGameDetails, fetchPartialGameInfo } from './bggScraper'

describe('bggScraper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Ensure we don't leak mocked fetch between tests
    // @ts-expect-error test cleanup
    delete globalThis.fetch
  })

  describe('extractBggIdFromUrl', () => {
    it('extracts ID from standard BGG URL', () => {
      expect(extractBggIdFromUrl('https://boardgamegeek.com/boardgame/169786/scythe'))
        .toBe(169786)
    })

    it('extracts ID from URL without game name', () => {
      expect(extractBggIdFromUrl('https://boardgamegeek.com/boardgame/169786'))
        .toBe(169786)
    })

    it('extracts ID from URL with www', () => {
      expect(extractBggIdFromUrl('https://www.boardgamegeek.com/boardgame/12345/catan'))
        .toBe(12345)
    })

    it('returns null for invalid URL', () => {
      expect(extractBggIdFromUrl('https://example.com/game/123')).toBeNull()
      expect(extractBggIdFromUrl('boardgame/123')).toBeNull()
    })
  })

  describe('isValidBggUrl', () => {
    it('returns true for valid BGG URLs', () => {
      expect(isValidBggUrl('https://boardgamegeek.com/boardgame/169786/scythe')).toBe(true)
      expect(isValidBggUrl('https://www.boardgamegeek.com/boardgame/123')).toBe(true)
    })

    it('returns false for invalid URLs', () => {
      expect(isValidBggUrl('https://example.com')).toBe(false)
      expect(isValidBggUrl('not a url')).toBe(false)
    })
  })

  describe('toGameDetails', () => {
    it('merges partial info with manual data', () => {
      const partial = { bggId: 123, name: 'Scythe', thumbnail: 'http://img.jpg' }
      const manual = { minPlayers: 2, maxPlayers: 5, playingTimeMinutes: 90 }
      
      const result = toGameDetails(partial, manual)
      
      expect(result.bggId).toBe(123)
      expect(result.name).toBe('Scythe')
      expect(result.thumbnail).toBe('http://img.jpg')
      expect(result.minPlayers).toBe(2)
      expect(result.maxPlayers).toBe(5)
      expect(result.playingTimeMinutes).toBe(90)
    })

    it('uses manual name over partial name', () => {
      const partial = { bggId: 123, name: 'Wrong Name' }
      const manual = { name: 'Correct Name' }
      
      const result = toGameDetails(partial, manual)
      
      expect(result.name).toBe('Correct Name')
    })

    it('uses default name when both are missing', () => {
      const partial = { bggId: 123 }
      
      const result = toGameDetails(partial)
      
      expect(result.name).toBe('Game #123')
    })
  })

  describe('fetchPartialGameInfo', () => {
    it('skips XML API when API key is missing and scrapes best/weight/description from HTML', async () => {
      vi.mocked(hasBggApiKey).mockReturnValue(false)

      const html = `
        <html>
          <head>
            <meta property="og:title" content="My Game (2020)" />
            <meta property="og:image" content="https://img.example/thumb.jpg" />
            <meta name="description" content="A &amp; B: great game." />
          </head>
          <body>
            <span class="ng-binding"> - Best: 3 </span>
            <span class="ng-binding"> Weight: 2.75 / 5 </span>
          </body>
        </html>
      `

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => html,
      }) as unknown as typeof fetch

      const result = await fetchPartialGameInfo('https://boardgamegeek.com/boardgame/12345/my-game')

      expect(fetchQueuedXml).not.toHaveBeenCalled()
      expect(result.bggId).toBe(12345)
      expect(result.name).toBe('My Game')
      expect(result.yearPublished).toBe(2020)
      expect(result.thumbnail).toBe('https://img.example/thumb.jpg')
      expect(result.bestWith).toBe('3')
      expect(result.weight).toBeCloseTo(2.75)
      expect(result.description).toBe('A & B: great game.')
    })

    it('normalizes bestWith when HTML includes player text', async () => {
      vi.mocked(hasBggApiKey).mockReturnValue(false)

      const html = `
        <html>
          <head>
            <meta property="og:title" content="My Game" />
          </head>
          <body>
            <span class="ng-binding">Best: 2, 4 players</span>
          </body>
        </html>
      `

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => html,
      }) as unknown as typeof fetch

      const result = await fetchPartialGameInfo('https://boardgamegeek.com/boardgame/999/my-game')
      expect(result.bestWith).toBe('2, 4')
    })
  })
})
