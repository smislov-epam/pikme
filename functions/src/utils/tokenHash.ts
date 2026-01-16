/**
 * Token Hashing Utility (REQ-101)
 *
 * Shared hashing logic for invite tokens.
 * Used by both CLI tool and Cloud Functions.
 */

import { createHash, randomBytes } from 'crypto';

/**
 * Generate a cryptographically secure random token.
 * Returns a URL-safe base64 string.
 */
export function generateToken(byteLength = 32): string {
  return randomBytes(byteLength).toString('base64url');
}

/**
 * Hash a token for storage.
 * We use SHA-256 which is fast and sufficient for token validation.
 * The raw token is never stored; only this hash is persisted.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
