/**
 * Invite Validation Tests (REQ-101)
 */

import { describe, it, expect } from 'vitest';
import {
  validateInvite,
  InviteErrorCodes,
  type InviteData,
} from './inviteValidation.js';

const NOW = Date.now();
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function createInvite(overrides: Partial<InviteData> = {}): InviteData {
  return {
    maxUses: 10,
    uses: 0,
    expiresAtMs: NOW + ONE_DAY_MS, // expires tomorrow
    revoked: false,
    ...overrides,
  };
}

describe('validateInvite', () => {
  it('returns valid for a fresh invite', () => {
    const invite = createInvite();
    const result = validateInvite(invite, NOW);
    expect(result).toEqual({ valid: true });
  });

  it('returns valid when uses < maxUses', () => {
    const invite = createInvite({ uses: 5, maxUses: 10 });
    const result = validateInvite(invite, NOW);
    expect(result).toEqual({ valid: true });
  });

  it('returns invalid when invite is revoked', () => {
    const invite = createInvite({ revoked: true });
    const result = validateInvite(invite, NOW);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe(InviteErrorCodes.INVITE_REVOKED);
    }
  });

  it('returns invalid when invite has expired', () => {
    const invite = createInvite({ expiresAtMs: NOW - 1000 }); // expired 1 second ago
    const result = validateInvite(invite, NOW);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe(InviteErrorCodes.EXPIRED_INVITE);
    }
  });

  it('returns invalid when uses >= maxUses (exhausted)', () => {
    const invite = createInvite({ uses: 10, maxUses: 10 });
    const result = validateInvite(invite, NOW);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe(InviteErrorCodes.INVITE_EXHAUSTED);
    }
  });

  it('returns invalid when uses > maxUses (over limit)', () => {
    const invite = createInvite({ uses: 15, maxUses: 10 });
    const result = validateInvite(invite, NOW);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe(InviteErrorCodes.INVITE_EXHAUSTED);
    }
  });

  it('prioritizes revoked over expired', () => {
    const invite = createInvite({
      revoked: true,
      expiresAtMs: NOW - 1000, // also expired
    });
    const result = validateInvite(invite, NOW);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe(InviteErrorCodes.INVITE_REVOKED);
    }
  });

  it('prioritizes expired over exhausted', () => {
    const invite = createInvite({
      expiresAtMs: NOW - 1000, // expired
      uses: 10,
      maxUses: 10, // also exhausted
    });
    const result = validateInvite(invite, NOW);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe(InviteErrorCodes.EXPIRED_INVITE);
    }
  });

  it('returns valid at exact expiry time (not expired yet)', () => {
    const invite = createInvite({ expiresAtMs: NOW });
    const result = validateInvite(invite, NOW - 1); // 1ms before expiry

    expect(result.valid).toBe(true);
  });

  it('returns invalid 1ms after expiry', () => {
    const invite = createInvite({ expiresAtMs: NOW });
    const result = validateInvite(invite, NOW + 1);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe(InviteErrorCodes.EXPIRED_INVITE);
    }
  });
});
