import { describe, expect, it } from 'vitest';
import { selectOpenUnclaimedSlotDoc } from './selectOpenUnclaimedSlot.js';
import type { DocumentReference } from 'firebase-admin/firestore';

function doc(id: string, participant: { claimed: boolean; slotType: 'open' | 'named' }) {
  return {
    id,
    ref: {} as DocumentReference,
    data: () => ({
      participantId: id,
      displayName: null,
      claimedByUid: null,
      claimedAt: null,
      inviteTokenHash: null,
      expiresAt: {} as never,
      ...participant,
    }),
  };
}

describe('selectOpenUnclaimedSlotDoc', () => {
  it('returns the first unclaimed open slot', () => {
    const picked = selectOpenUnclaimedSlotDoc([
      doc('n1', { claimed: false, slotType: 'named' }),
      doc('o1', { claimed: false, slotType: 'open' }),
      doc('o2', { claimed: false, slotType: 'open' }),
    ]);

    expect(picked?.id).toBe('o1');
  });

  it('returns null when only named slots are available', () => {
    const picked = selectOpenUnclaimedSlotDoc([
      doc('n1', { claimed: false, slotType: 'named' }),
      doc('n2', { claimed: false, slotType: 'named' }),
    ]);

    expect(picked).toBeNull();
  });

  it('returns null when all open slots are claimed', () => {
    const picked = selectOpenUnclaimedSlotDoc([
      doc('o1', { claimed: true, slotType: 'open' }),
      doc('o2', { claimed: true, slotType: 'open' }),
    ]);

    expect(picked).toBeNull();
  });
});
