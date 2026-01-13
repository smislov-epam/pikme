import { describe, expect, it } from 'vitest'
import { parseThingXml } from './parseThingXml'

describe('parseThingXml', () => {
  it('parses basic thing details', () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<items>
  <item type="boardgame" id="42">
    <thumbnail>http://example.com/t.png</thumbnail>
    <name type="primary" value="Test Game" />
    <yearpublished value="2020" />
    <minplayers value="2" />
    <maxplayers value="5" />
    <playingtime value="60" />
    <link type="boardgamemechanic" id="1" value="Deck, Bag, and Pool Building" />
  </item>
</items>`

    expect(parseThingXml(xml)).toEqual([
      {
        bggId: 42,
        name: 'Test Game',
        yearPublished: 2020,
        thumbnail: 'http://example.com/t.png',
        image: undefined,
        minPlayers: 2,
        maxPlayers: 5,
        playingTimeMinutes: 60,
        minPlayTimeMinutes: undefined,
        maxPlayTimeMinutes: undefined,
        mechanics: ['Deck, Bag, and Pool Building'],
      },
    ])
  })

  it('prefers poll-summary bestwith when present', () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<items>
  <item type="boardgame" id="217372">
    <name type="primary" value="The Quest for El Dorado" />
    <minplayers value="2" />
    <maxplayers value="4" />
    <poll-summary name="suggested_numplayers" title="User Suggested Number of Players">
      <result name="bestwith" value="Best with 2, 4 players" />
    </poll-summary>
    <poll name="suggested_numplayers" title="User Suggested Number of Players" totalvotes="498">
      <results numplayers="2"><result value="Best" numvotes="233" /></results>
      <results numplayers="4"><result value="Best" numvotes="312" /></results>
    </poll>
  </item>
</items>`

    expect(parseThingXml(xml)).toEqual([
      {
        bggId: 217372,
        name: 'The Quest for El Dorado',
        yearPublished: undefined,
        thumbnail: undefined,
        image: undefined,
        minPlayers: 2,
        maxPlayers: 4,
        bestWith: '2, 4',
        playingTimeMinutes: undefined,
        minPlayTimeMinutes: undefined,
        maxPlayTimeMinutes: undefined,
        minAge: undefined,
        mechanics: undefined,
        categories: undefined,
        description: undefined,
        averageRating: undefined,
        weight: undefined,
      },
    ])
  })

  it('parses full game details with stats (like The Druids of Edora)', () => {
    // Sample XML based on BGG xmlapi2/thing?id=440007&stats=1 structure
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<items termsofuse="https://boardgamegeek.com/xmlapi/termsofuse">
  <item type="boardgame" id="440007">
    <thumbnail>https://cf.geekdo-images.com/XYZ/thumb/druids.jpg</thumbnail>
    <image>https://cf.geekdo-images.com/XYZ/original/druids.jpg</image>
    <name type="primary" sortindex="1" value="The Druids of Edora" />
    <name type="alternate" sortindex="1" value="Les Druides d'Edora" />
    <description>In The Druids of Edora, you play as mystical druids gathering resources and casting powerful spells.&amp;#10;&amp;#10;This is a cooperative game where players work together to save the enchanted forest.</description>
    <yearpublished value="2024" />
    <minplayers value="1" />
    <maxplayers value="4" />
    <playingtime value="90" />
    <minplaytime value="60" />
    <maxplaytime value="120" />
    <minage value="14" />
    <link type="boardgamecategory" id="1022" value="Adventure" />
    <link type="boardgamecategory" id="1010" value="Fantasy" />
    <link type="boardgamemechanic" id="2023" value="Cooperative Game" />
    <link type="boardgamemechanic" id="2664" value="Deck, Bag, and Pool Building" />
    <link type="boardgamemechanic" id="2040" value="Hand Management" />
    <statistics page="1">
      <ratings>
        <usersrated value="1250" />
        <average value="7.85" />
        <bayesaverage value="6.12" />
        <stddev value="1.32" />
        <median value="0" />
        <owned value="4500" />
        <trading value="45" />
        <wanting value="320" />
        <wishing value="890" />
        <numcomments value="210" />
        <numweights value="185" />
        <averageweight value="3.42" />
      </ratings>
    </statistics>
  </item>
</items>`

    const result = parseThingXml(xml)
    expect(result).toHaveLength(1)
    
    const game = result[0]
    expect(game.bggId).toBe(440007)
    expect(game.name).toBe('The Druids of Edora')
    expect(game.yearPublished).toBe(2024)
    expect(game.thumbnail).toBe('https://cf.geekdo-images.com/XYZ/thumb/druids.jpg')
    expect(game.image).toBe('https://cf.geekdo-images.com/XYZ/original/druids.jpg')
    
    // Player counts
    expect(game.minPlayers).toBe(1)
    expect(game.maxPlayers).toBe(4)
    
    // Playing time - all three fields should be parsed
    expect(game.playingTimeMinutes).toBe(90)
    expect(game.minPlayTimeMinutes).toBe(60)
    expect(game.maxPlayTimeMinutes).toBe(120)
    
    // Age
    expect(game.minAge).toBe(14)
    
    // Categories and mechanics
    expect(game.categories).toEqual(['Adventure', 'Fantasy'])
    expect(game.mechanics).toEqual(['Cooperative Game', 'Deck, Bag, and Pool Building', 'Hand Management'])
    
    // Description (HTML entities decoded, limited length)
    expect(game.description).toContain('mystical druids')
    expect(game.description).toContain('cooperative game')
    
    // Stats from statistics block
    expect(game.averageRating).toBe(7.85)
    expect(game.weight).toBe(3.42)
  })
})
