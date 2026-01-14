vi.mock('./bggClient', async () => {
  const actual = await vi.importActual<typeof import('./bggClient')>('./bggClient')
  return {
    ...actual,
    hasBggApiKey: () => true,
    fetchQueuedXml: vi.fn(),
  }
})

import { BggUserNotFoundError, fetchQueuedXml } from './bggClient'
import { fetchOwnedCollection } from './bggService'

describe('fetchOwnedCollection (user not found)', () => {
  it('throws BggUserNotFoundError when BGG returns a user-not-found message', async () => {
    vi.mocked(fetchQueuedXml).mockResolvedValue(`<?xml version="1.0" encoding="utf-8"?>
<items totalitems="0" termsofuse="https://boardgamegeek.com/xmlapi/termsofuse">
  <message>User not found</message>
</items>`)

    await expect(fetchOwnedCollection('ghost_user')).rejects.toBeInstanceOf(BggUserNotFoundError)
  })
})
