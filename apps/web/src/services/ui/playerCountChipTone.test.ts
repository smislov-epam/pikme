import { playerCountChipTone } from './playerCountChipTone'

describe('playerCountChipTone', () => {
  it('marks the selected count as selected', () => {
    expect(playerCountChipTone({ count: 4, selectedCount: 4, sessionUserCount: 4 })).toBe('selected')
  })

  it('treats counts up to session size as inSession', () => {
    expect(playerCountChipTone({ count: 2, selectedCount: 4, sessionUserCount: 4 })).toBe('inSession')
    expect(playerCountChipTone({ count: 4, selectedCount: 3, sessionUserCount: 4 })).toBe('inSession')
  })

  it('treats counts above session size as aboveSession', () => {
    expect(playerCountChipTone({ count: 6, selectedCount: 4, sessionUserCount: 4 })).toBe('aboveSession')
  })

  it('defaults to inSession when session size is unknown', () => {
    expect(playerCountChipTone({ count: 10, selectedCount: 2, sessionUserCount: 0 })).toBe('inSession')
  })
})
