/**
 * Session Validation Tests (REQ-102)
 */

import { describe, it, expect } from 'vitest';

/**
 * Session capacity validation (extracted for testing).
 */
function validateCapacity(capacity: number): { valid: boolean; error?: string } {
  const MIN_CAPACITY = 2;
  const MAX_CAPACITY = 12;

  if (capacity < MIN_CAPACITY) {
    return { valid: false, error: `Capacity must be at least ${MIN_CAPACITY}` };
  }
  if (capacity > MAX_CAPACITY) {
    return { valid: false, error: `Capacity cannot exceed ${MAX_CAPACITY}` };
  }
  return { valid: true };
}

/**
 * Game list validation (extracted for testing).
 */
function validateGameList(gameIds: string[]): { valid: boolean; error?: string } {
  const MAX_GAMES = 50;

  if (!gameIds || gameIds.length === 0) {
    return { valid: false, error: 'At least one game is required' };
  }
  if (gameIds.length > MAX_GAMES) {
    return { valid: false, error: `Maximum ${MAX_GAMES} games per session` };
  }
  return { valid: true };
}

/**
 * Session TTL calculation.
 */
function calculateExpiresAt(nowMs: number, ttlHours: number = 24): number {
  return nowMs + ttlHours * 60 * 60 * 1000;
}

describe('validateCapacity', () => {
  it('accepts capacity within range', () => {
    expect(validateCapacity(2).valid).toBe(true);
    expect(validateCapacity(6).valid).toBe(true);
    expect(validateCapacity(12).valid).toBe(true);
  });

  it('rejects capacity below minimum', () => {
    const result = validateCapacity(1);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('at least 2');
  });

  it('rejects capacity above maximum', () => {
    const result = validateCapacity(13);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('cannot exceed 12');
  });
});

describe('validateGameList', () => {
  it('accepts non-empty game list', () => {
    expect(validateGameList(['123']).valid).toBe(true);
    expect(validateGameList(['1', '2', '3']).valid).toBe(true);
  });

  it('rejects empty game list', () => {
    const result = validateGameList([]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('At least one game');
  });

  it('rejects game list exceeding maximum', () => {
    const manyGames = Array.from({ length: 51 }, (_, i) => String(i));
    const result = validateGameList(manyGames);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Maximum 50');
  });
});

describe('calculateExpiresAt', () => {
  it('adds 24 hours by default', () => {
    const now = Date.now();
    const expires = calculateExpiresAt(now);
    const diff = expires - now;
    expect(diff).toBe(24 * 60 * 60 * 1000);
  });

  it('respects custom TTL', () => {
    const now = Date.now();
    const expires = calculateExpiresAt(now, 48);
    const diff = expires - now;
    expect(diff).toBe(48 * 60 * 60 * 1000);
  });
});
