/**
 * Session Preview Cache (REQ-107)
 *
 * Short-lived cache for session previews to prevent redundant Cloud Function calls.
 */

import type { SessionPreview } from './types';

/** Cache entry with data and timestamp */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/** Session preview cache with short TTL to prevent redundant calls */
const sessionPreviewCache = new Map<string, CacheEntry<SessionPreview>>();

/** Cache TTL in milliseconds (3 seconds) */
export const CACHE_TTL_MS = 3000;

/** Clear expired cache entries */
function cleanupCache(): void {
  const now = Date.now();
  for (const [key, entry] of sessionPreviewCache) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      sessionPreviewCache.delete(key);
    }
  }
}

// Clean up cache every 30 seconds
setInterval(cleanupCache, 30000);

/**
 * Get cached session preview if available and not expired.
 */
export function getCachedPreview(sessionId: string): SessionPreview | null {
  const cached = sessionPreviewCache.get(sessionId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  return null;
}

/**
 * Store session preview in cache.
 */
export function setCachedPreview(sessionId: string, preview: SessionPreview): void {
  sessionPreviewCache.set(sessionId, { data: preview, timestamp: Date.now() });
}

/**
 * Clear cache for a specific session (for testing).
 */
export function clearPreviewCache(sessionId?: string): void {
  if (sessionId) {
    sessionPreviewCache.delete(sessionId);
  } else {
    sessionPreviewCache.clear();
  }
}
