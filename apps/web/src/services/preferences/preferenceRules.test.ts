import { describe, expect, it } from 'vitest'
import { normalizePreferenceUpdate } from './preferenceRules'

describe('preferenceRules.normalizePreferenceUpdate', () => {
  it('defaults to neutral when no existing and empty update', () => {
    expect(normalizePreferenceUpdate(undefined, {})).toEqual({
      rank: undefined,
      isTopPick: false,
      isDisliked: false,
    })
  })

  it('dislike clears rank and top-pick', () => {
    expect(normalizePreferenceUpdate({ rank: 1, isTopPick: true, isDisliked: false }, { isDisliked: true })).toEqual({
      rank: undefined,
      isTopPick: false,
      isDisliked: true,
    })
  })

  it('top-pick clears rank', () => {
    expect(normalizePreferenceUpdate({ rank: 2, isTopPick: false, isDisliked: false }, { isTopPick: true })).toEqual({
      rank: undefined,
      isTopPick: true,
      isDisliked: false,
    })
  })

  it('rank clears dislike and top-pick', () => {
    expect(normalizePreferenceUpdate({ rank: undefined, isTopPick: true, isDisliked: true }, { rank: 3 })).toEqual({
      rank: 3,
      isTopPick: false,
      isDisliked: false,
    })
  })

  it('clearing dislike returns neutral (does not resurrect old rank)', () => {
    expect(normalizePreferenceUpdate({ rank: undefined, isTopPick: false, isDisliked: true }, { isDisliked: false })).toEqual({
      rank: undefined,
      isTopPick: false,
      isDisliked: false,
    })
  })
})
