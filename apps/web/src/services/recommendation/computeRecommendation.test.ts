/**
 * Tests for computeRecommendation - Normalized Borda count scoring algorithm.
 */
import { describe, it, expect } from 'vitest'
import { computeRecommendation, getMatchReasons } from './computeRecommendation'
import type { GameRecord, UserPreferenceRecord } from '../../db/types'
import type { WizardFilters } from '../../store/wizardTypes'

// ─────────────────────────────────────────────────────────────────────────────
// Test Fixtures
// ─────────────────────────────────────────────────────────────────────────────
const baseGame = (bggId: number, name: string, overrides: Partial<GameRecord> = {}): GameRecord => ({
  bggId,
  name,
  minPlayers: 2,
  maxPlayers: 4,
  playingTimeMinutes: 60,
  lastFetchedAt: '2026-01-10T10:00:00Z',
  ...overrides,
})

const games: GameRecord[] = [
  baseGame(1, 'Game A'),
  baseGame(2, 'Game B'),
  baseGame(3, 'Game C'),
  baseGame(4, 'Game D'),
]

const defaultFilters: WizardFilters = {
  playerCount: 4,
  timeRange: { min: 0, max: 300 },
  mode: 'any',
  requireBestWithPlayerCount: false,
  excludeLowRatedThreshold: null,
  ageRange: { min: 0, max: 21 },
  complexityRange: { min: 1, max: 5 },
  ratingRange: { min: 0, max: 10 },
}

const users = [{ username: 'alice' }, { username: 'bob' }]

// ─────────────────────────────────────────────────────────────────────────────
// Empty/Edge Cases
// ─────────────────────────────────────────────────────────────────────────────
describe('computeRecommendation - edge cases', () => {
  it('returns empty result when no games', () => {
    const result = computeRecommendation({
      games: [],
      preferences: {},
      filters: defaultFilters,
      users,
      promotedPickBggId: null,
    })

    expect(result.topPick).toBeNull()
    expect(result.alternatives).toHaveLength(0)
    expect(result.vetoed).toHaveLength(0)
  })

  it('returns empty result when no users', () => {
    const result = computeRecommendation({
      games,
      preferences: {},
      filters: defaultFilters,
      users: [],
      promotedPickBggId: null,
    })

    expect(result.topPick).toBeNull()
  })

  it('returns games with 0 score when no preferences', () => {
    const result = computeRecommendation({
      games,
      preferences: {},
      filters: defaultFilters,
      users,
      promotedPickBggId: null,
    })

    expect(result.topPick).not.toBeNull()
    expect(result.topPick?.score).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Normalized Borda Count Scoring
// ─────────────────────────────────────────────────────────────────────────────
describe('computeRecommendation - Normalized Borda count', () => {
  it('scores games based on ranking position (normalized 0-1)', () => {
    const preferences: Record<string, UserPreferenceRecord[]> = {
      alice: [
        { username: 'alice', bggId: 1, rank: 1, isTopPick: false, isDisliked: false, updatedAt: '' },
        { username: 'alice', bggId: 2, rank: 2, isTopPick: false, isDisliked: false, updatedAt: '' },
        { username: 'alice', bggId: 3, rank: 3, isTopPick: false, isDisliked: false, updatedAt: '' },
      ],
    }

    const result = computeRecommendation({
      games,
      preferences,
      filters: defaultFilters,
      users,
      promotedPickBggId: null,
    })

    // With 3 ranked games (m=3), normalized scores:
    // rank 1: (3-1-0)/(3-1) = 2/2 = 1.0
    // rank 2: (3-1-1)/(3-1) = 1/2 = 0.5
    // rank 3: (3-1-2)/(3-1) = 0/2 = 0.0
    expect(result.topPick?.game.bggId).toBe(1)
    expect(result.topPick?.score).toBe(1)

    const gameB = result.alternatives.find((a) => a.game.bggId === 2)
    expect(gameB?.score).toBe(0.5)
  })

  it('aggregates normalized scores across multiple users equally', () => {
    const preferences: Record<string, UserPreferenceRecord[]> = {
      alice: [
        { username: 'alice', bggId: 1, rank: 1, isTopPick: false, isDisliked: false, updatedAt: '' },
        { username: 'alice', bggId: 2, rank: 2, isTopPick: false, isDisliked: false, updatedAt: '' },
      ],
      bob: [
        { username: 'bob', bggId: 2, rank: 1, isTopPick: false, isDisliked: false, updatedAt: '' },
        { username: 'bob', bggId: 1, rank: 2, isTopPick: false, isDisliked: false, updatedAt: '' },
      ],
    }

    const result = computeRecommendation({
      games,
      preferences,
      filters: defaultFilters,
      users,
      promotedPickBggId: null,
    })

    // Game 1: Alice rank 1 (1.0) + Bob rank 2 (0.0) = 1.0
    // Game 2: Alice rank 2 (0.0) + Bob rank 1 (1.0) = 1.0
    // Both have equal scores, order depends on input order
    expect([1, 2]).toContain(result.topPick?.game.bggId)
    expect(result.topPick?.score).toBe(1)
  })

  it('normalizes user contributions regardless of list length', () => {
    // Alice ranks 2 games, Bob ranks 10 games
    // With normalization, both should contribute equally
    const preferences: Record<string, UserPreferenceRecord[]> = {
      alice: [
        { username: 'alice', bggId: 1, rank: 1, isTopPick: false, isDisliked: false, updatedAt: '' },
        { username: 'alice', bggId: 2, rank: 2, isTopPick: false, isDisliked: false, updatedAt: '' },
      ],
      bob: [
        { username: 'bob', bggId: 2, rank: 1, isTopPick: false, isDisliked: false, updatedAt: '' },
        { username: 'bob', bggId: 3, rank: 2, isTopPick: false, isDisliked: false, updatedAt: '' },
        { username: 'bob', bggId: 4, rank: 3, isTopPick: false, isDisliked: false, updatedAt: '' },
      ],
    }

    const result = computeRecommendation({
      games,
      preferences,
      filters: defaultFilters,
      users,
      promotedPickBggId: null,
    })

    // Alice: Game 1 = 1.0, Game 2 = 0.0
    // Bob (m=3): Game 2 = 1.0, Game 3 = 0.5, Game 4 = 0.0
    // Game 1 total: 1.0 (from Alice only)
    // Game 2 total: 0.0 + 1.0 = 1.0
    // Both top games have 1.0 - normalized ensures Alice's vote counts equally
    expect([1, 2]).toContain(result.topPick?.game.bggId)
  })

  it('adds top-pick bonus (0.5)', () => {
    const preferences: Record<string, UserPreferenceRecord[]> = {
      alice: [
        { username: 'alice', bggId: 1, rank: undefined, isTopPick: true, isDisliked: false, updatedAt: '' },
        { username: 'alice', bggId: 2, rank: 1, isTopPick: false, isDisliked: false, updatedAt: '' },
      ],
    }

    const result = computeRecommendation({
      games,
      preferences,
      filters: defaultFilters,
      users,
      promotedPickBggId: null,
    })

    // Both games included in rankedPrefs (m=2)
    // Sorted by rank: Game 2 (rank 1) at index 0, Game 1 (rank undefined=999) at index 1
    // Game 2: normalized score = 1.0
    // Game 1: normalized score = 0.0 + 0.5 top-pick bonus = 0.5
    // Game 2 wins with score 1.0
    expect(result.topPick?.game.bggId).toBe(2)
    expect(result.topPick?.score).toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Veto Logic
// ─────────────────────────────────────────────────────────────────────────────
describe('computeRecommendation - veto', () => {
  it('excludes disliked games from results', () => {
    const preferences: Record<string, UserPreferenceRecord[]> = {
      alice: [
        { username: 'alice', bggId: 1, rank: 1, isTopPick: false, isDisliked: false, updatedAt: '' },
        { username: 'alice', bggId: 2, rank: undefined, isTopPick: false, isDisliked: true, updatedAt: '' },
      ],
    }

    const result = computeRecommendation({
      games,
      preferences,
      filters: defaultFilters,
      users,
      promotedPickBggId: null,
    })

    expect(result.topPick?.game.bggId).toBe(1)
    expect(result.vetoed).toHaveLength(1)
    expect(result.vetoed[0].game.bggId).toBe(2)
    expect(result.vetoed[0].vetoedBy).toContain('alice')
  })

  it('tracks multiple users who vetoed same game', () => {
    const preferences: Record<string, UserPreferenceRecord[]> = {
      alice: [
        { username: 'alice', bggId: 1, rank: undefined, isTopPick: false, isDisliked: true, updatedAt: '' },
      ],
      bob: [
        { username: 'bob', bggId: 1, rank: undefined, isTopPick: false, isDisliked: true, updatedAt: '' },
      ],
    }

    const result = computeRecommendation({
      games,
      preferences,
      filters: defaultFilters,
      users,
      promotedPickBggId: null,
    })

    expect(result.vetoed[0].vetoedBy).toEqual(['alice', 'bob'])
  })

  it('returns null topPick when all games vetoed', () => {
    const singleGame = [baseGame(1, 'Only Game')]
    const preferences: Record<string, UserPreferenceRecord[]> = {
      alice: [
        { username: 'alice', bggId: 1, rank: undefined, isTopPick: false, isDisliked: true, updatedAt: '' },
      ],
    }

    const result = computeRecommendation({
      games: singleGame,
      preferences,
      filters: defaultFilters,
      users,
      promotedPickBggId: null,
    })

    expect(result.topPick).toBeNull()
    expect(result.vetoed).toHaveLength(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Promoted Pick Override
// ─────────────────────────────────────────────────────────────────────────────
describe('computeRecommendation - promoted pick', () => {
  it('moves promoted game to top pick', () => {
    const preferences: Record<string, UserPreferenceRecord[]> = {
      alice: [
        { username: 'alice', bggId: 1, rank: 1, isTopPick: false, isDisliked: false, updatedAt: '' },
        { username: 'alice', bggId: 2, rank: 2, isTopPick: false, isDisliked: false, updatedAt: '' },
      ],
    }

    const result = computeRecommendation({
      games,
      preferences,
      filters: defaultFilters,
      users,
      promotedPickBggId: 2, // Promote lower-ranked game
    })

    expect(result.topPick?.game.bggId).toBe(2)
  })

  it('ignores invalid promoted pick ID', () => {
    const preferences: Record<string, UserPreferenceRecord[]> = {
      alice: [
        { username: 'alice', bggId: 1, rank: 1, isTopPick: false, isDisliked: false, updatedAt: '' },
      ],
    }

    const result = computeRecommendation({
      games,
      preferences,
      filters: defaultFilters,
      users,
      promotedPickBggId: 999, // Non-existent game
    })

    expect(result.topPick?.game.bggId).toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Match Reasons
// ─────────────────────────────────────────────────────────────────────────────
describe('getMatchReasons', () => {
  it('includes player count when in range', () => {
    const game = baseGame(1, 'Test', { minPlayers: 2, maxPlayers: 6 })
    const filters = { ...defaultFilters, playerCount: 4 }

    const reasons = getMatchReasons(game, filters)

    expect(reasons).toContain('✓ 4 players')
  })

  it('categorizes play time', () => {
    expect(getMatchReasons(baseGame(1, 'A', { playingTimeMinutes: 20 }), defaultFilters))
      .toContain('Quick game')
    expect(getMatchReasons(baseGame(2, 'B', { playingTimeMinutes: 45 }), defaultFilters))
      .toContain('Medium length')
    expect(getMatchReasons(baseGame(3, 'C', { playingTimeMinutes: 120 }), defaultFilters))
      .toContain('Epic session')
  })

  it('includes coop indicator when filtering coop', () => {
    const coopGame = baseGame(1, 'Coop', { mechanics: ['Cooperative Game'] })
    const coopFilters = { ...defaultFilters, mode: 'coop' as const }

    const reasons = getMatchReasons(coopGame, coopFilters)

    expect(reasons).toContain('🤝 Cooperative')
  })

  it('includes competitive indicator when filtering competitive', () => {
    const competitiveGame = baseGame(1, 'Versus', { mechanics: ['Area Control'] })
    const competitiveFilters = { ...defaultFilters, mode: 'competitive' as const }

    const reasons = getMatchReasons(competitiveGame, competitiveFilters)

    expect(reasons).toContain('⚔️ Competitive')
  })
})
