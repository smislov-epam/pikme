/**
 * Session Service Cache Tests
 *
 * Tests for the getSessionPreview caching functionality.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Sample response from the Cloud Function
const mockSessionResponse = {
  ok: true,
  sessionId: 'test-session-123',
  title: 'Test Game Night',
  hostName: 'Alice',
  scheduledFor: '2026-01-20T19:00:00.000Z',
  minPlayers: 2,
  maxPlayers: 6,
  minPlayingTimeMinutes: 30,
  maxPlayingTimeMinutes: 120,
  gameCount: 5,
  status: 'open' as const,
  capacity: 6,
  claimedCount: 2,
  availableSlots: 4,
  namedSlots: [],
  shareMode: 'detailed' as const,
  showOtherParticipantsPicks: true,
  hostUid: 'host-uid-123',
  callerRole: 'guest' as const,
};

// Mock callFunction before importing the module under test
const mockCallFunction = vi.fn().mockResolvedValue(mockSessionResponse);

vi.mock('../firebase', () => ({
  callFunction: (...args: unknown[]) => mockCallFunction(...args),
  callFunctionNoRetry: vi.fn(),
}));

// Import after mock setup
import { getSessionPreview } from './sessionService';
import { stopPreviewCacheCleanup } from './sessionPreviewCache';

describe('getSessionPreview caching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCallFunction.mockResolvedValue(mockSessionResponse);
    vi.useRealTimers();
  });

  afterEach(() => {
    stopPreviewCacheCleanup();
    vi.useRealTimers();
  });

  it('calls the Cloud Function on first request', async () => {
    const result = await getSessionPreview('session-first-' + Math.random());

    expect(mockCallFunction).toHaveBeenCalledTimes(1);
    expect(result.sessionId).toBe('test-session-123');
    expect(result.title).toBe('Test Game Night');
  });

  it('returns cached result on subsequent requests within TTL', async () => {
    const sessionId = 'session-cache-' + Math.random();
    
    // First call - should hit the API
    await getSessionPreview(sessionId);
    expect(mockCallFunction).toHaveBeenCalledTimes(1);

    // Second call - should use cache
    const result = await getSessionPreview(sessionId);
    expect(mockCallFunction).toHaveBeenCalledTimes(1); // Still 1, not 2
    expect(result.title).toBe('Test Game Night');
  });

  it('fetches fresh data when skipCache is true', async () => {
    const sessionId = 'session-skip-' + Math.random();
    
    // First call - populates cache
    await getSessionPreview(sessionId);
    expect(mockCallFunction).toHaveBeenCalledTimes(1);

    // Second call with skipCache - should bypass cache
    await getSessionPreview(sessionId, true);
    expect(mockCallFunction).toHaveBeenCalledTimes(2);
  });

  it('fetches fresh data after cache TTL expires', async () => {
    vi.useFakeTimers();
    const sessionId = 'session-ttl-' + Math.random();

    // First call - populates cache
    await getSessionPreview(sessionId);
    expect(mockCallFunction).toHaveBeenCalledTimes(1);

    // Advance time past the cache TTL (3 seconds)
    vi.advanceTimersByTime(4000);

    // Second call - should fetch fresh data because cache expired
    await getSessionPreview(sessionId);
    expect(mockCallFunction).toHaveBeenCalledTimes(2);
  });

  it('caches different sessions independently', async () => {
    // Call for session A
    const sessionA = 'session-a-' + Math.random();
    const sessionB = 'session-b-' + Math.random();
    
    await getSessionPreview(sessionA);
    expect(mockCallFunction).toHaveBeenCalledTimes(1);

    // Call for session B - should hit API (different session)
    await getSessionPreview(sessionB);
    expect(mockCallFunction).toHaveBeenCalledTimes(2);

    // Call for session A again - should use cache
    await getSessionPreview(sessionA);
    expect(mockCallFunction).toHaveBeenCalledTimes(2); // Still 2
  });
});
