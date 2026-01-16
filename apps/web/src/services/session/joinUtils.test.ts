import { describe, expect, it } from 'vitest';
import { findMatchingNamedSlot } from './joinUtils';

describe('findMatchingNamedSlot', () => {
  it('matches a slot by display name (case-insensitive)', () => {
    const slots = [
      { participantId: 'p1', displayName: 'Carol', hasSharedPreferences: true },
      { participantId: 'p2', displayName: 'Bob', hasSharedPreferences: false },
    ];

    const match = findMatchingNamedSlot('carol', slots);

    expect(match?.participantId).toBe('p1');
  });

  it('returns null when no match exists', () => {
    const slots = [{ participantId: 'p1', displayName: 'Alice', hasSharedPreferences: true }];

    const match = findMatchingNamedSlot('Bob', slots);

    expect(match).toBeNull();
  });
});
