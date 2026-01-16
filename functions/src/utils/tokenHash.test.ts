/**
 * Token Hash Utility Tests (REQ-101)
 */

import { describe, it, expect } from 'vitest';
import { generateToken, hashToken } from './tokenHash.js';

describe('generateToken', () => {
  it('generates a non-empty string', () => {
    const token = generateToken();
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
  });

  it('generates unique tokens', () => {
    const token1 = generateToken();
    const token2 = generateToken();
    expect(token1).not.toBe(token2);
  });

  it('generates URL-safe base64 tokens', () => {
    const token = generateToken();
    // URL-safe base64 should not contain +, /, or =
    expect(token).not.toMatch(/[+/=]/);
  });

  it('respects byte length parameter', () => {
    const shortToken = generateToken(16);
    const longToken = generateToken(64);
    // base64url is ~4/3 of byte length
    expect(shortToken.length).toBeLessThan(longToken.length);
  });
});

describe('hashToken', () => {
  it('returns a hex string', () => {
    const hash = hashToken('test-token');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('returns consistent hash for same input', () => {
    const hash1 = hashToken('my-secret-token');
    const hash2 = hashToken('my-secret-token');
    expect(hash1).toBe(hash2);
  });

  it('returns different hashes for different inputs', () => {
    const hash1 = hashToken('token-a');
    const hash2 = hashToken('token-b');
    expect(hash1).not.toBe(hash2);
  });

  it('is deterministic (no salt)', () => {
    // SHA-256 of 'hello' is well-known
    const hash = hashToken('hello');
    expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });
});
