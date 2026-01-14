import { parseCollectionXml, parseCollectionXmlResponse } from './parseCollectionXml'

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

  it('extracts a BGG message when present', () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<items totalitems="0" termsofuse="https://boardgamegeek.com/xmlapi/termsofuse">
  <message>Invalid username specified</message>
</items>`

    expect(parseCollectionXmlResponse(xml)).toEqual({ items: [], message: 'Invalid username specified' })
  })
})
