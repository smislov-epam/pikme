/**
 * Auth Service Tests
 *
 * Tests for auth-related functions, including race condition handling.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// We need to test the onAuthStateChange race condition fix
// by mocking the dynamic import

describe('onAuthStateChange', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('handles cleanup before import resolves without errors', async () => {
    // This test verifies the race condition fix:
    // If unsubscribe is called before the dynamic import resolves,
    // it should NOT throw an error or call the callback after cleanup

    const mockUnsubscribe = vi.fn();

    // Mock firebase/auth with a delayed import
    vi.doMock('firebase/auth', () => ({
      onAuthStateChanged: vi.fn(() => {
        return mockUnsubscribe;
      }),
    }));

    // Mock getAuthInstance to return a mock auth object
    vi.doMock('./init', () => ({
      getAuthInstance: vi.fn(() => ({ currentUser: null })),
      isFirebaseInitialized: vi.fn(() => true),
    }));

    // Import the module under test
    const { onAuthStateChange } = await import('./auth');

    const callback = vi.fn();
    
    // Subscribe
    const unsubscribe = onAuthStateChange(callback);

    // Immediately unsubscribe (before the dynamic import would resolve in real scenario)
    unsubscribe();

    // Wait for any pending promises
    await new Promise((resolve) => setTimeout(resolve, 10));

    // The callback should not have been called after unsubscribe
    // (In the fixed version, the cancelled flag prevents this)
    expect(callback).not.toHaveBeenCalled();
  });

  it('returns null user when Firebase is not initialized', async () => {
    // Mock getAuthInstance to return null (Firebase not initialized)
    vi.doMock('./init', () => ({
      getAuthInstance: vi.fn(() => null),
      isFirebaseInitialized: vi.fn(() => false),
    }));

    const { onAuthStateChange } = await import('./auth');

    const callback = vi.fn();
    const unsubscribe = onAuthStateChange(callback);

    // Should call callback with null immediately
    expect(callback).toHaveBeenCalledWith(null);

    // Cleanup should work without errors
    expect(() => unsubscribe()).not.toThrow();
  });
});
