import { describe, expect, it } from 'vitest'
import { parseCollectionXml } from './parseCollectionXml'

describe('parseCollectionXml', () => {
  it('parses basic collection items', () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<items totalitems="1" termsofuse="https://boardgamegeek.com/xmlapi/termsofuse">
  <item objecttype="thing" objectid="123">
    <name sortindex="1">Catan</name>
    <yearpublished>1995</yearpublished>
    <stats>
      <rating value="7"/>
    </stats>
  </item>
</items>`

    expect(parseCollectionXml(xml)).toEqual([
      { bggId: 123, name: 'Catan', yearPublished: 1995, userRating: 7 },
    ])
  })
})
