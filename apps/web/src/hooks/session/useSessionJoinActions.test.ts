import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { createElement, type PropsWithChildren } from 'react';
import type { SessionJoinData } from './useSessionJoinData';
import { useSessionJoinActions } from './useSessionJoinActions';
import { RouterTestWrapper } from '../../test/routerTestUtils';

const firebaseMocks = vi.hoisted(() => ({
  initializeFirebase: vi.fn(),
  getAuthInstance: vi.fn(),
}));

const sessionMocks = vi.hoisted(() => ({
  claimSessionSlot: vi.fn(),
  getSessionGames: vi.fn(),
  getSharedPreferences: vi.fn(),
  hydrateSessionGames: vi.fn(),
}));

const analyticsMocks = vi.hoisted(() => ({
  trackSessionJoined: vi.fn(),
}));

vi.mock('../../services/firebase', () => firebaseMocks);

vi.mock('../../services/session', () => sessionMocks);

vi.mock('../../services/analytics/googleAnalytics', () => analyticsMocks);

vi.mock('firebase/auth', () => ({
  signInAnonymously: vi.fn(),
}));

describe('useSessionJoinActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firebaseMocks.initializeFirebase.mockResolvedValue(true);
    firebaseMocks.getAuthInstance.mockReturnValue({ currentUser: null });
  });

  const createData = (overrides: Partial<SessionJoinData> = {}): SessionJoinData => ({
    state: 'preview',
    setState: vi.fn(),
    preview: null,
    setPreview: vi.fn(),
    displayName: 'Guest',
    setDisplayName: vi.fn(),
    error: null,
    setError: vi.fn(),
    isJoining: false,
    setIsJoining: vi.fn(),
    isSelectingSource: false,
    setIsSelectingSource: vi.fn(),
    selectedSlot: null,
    setSelectedSlot: vi.fn(),
    showNameInput: false,
    setShowNameInput: vi.fn(),
    sharedPreferences: [],
    setSharedPreferences: vi.fn(),
    hasSharedPreferences: false,
    setHasSharedPreferences: vi.fn(),
    claimedNamedSlot: false,
    setClaimedNamedSlot: vi.fn(),
    localOwner: null,
    hasLocalPreferences: false,
    sessionId: 'session-123',
    callerRole: null,
    ...overrides,
  });

  it('surfaces a friendly error when Firebase is unavailable', async () => {
    firebaseMocks.initializeFirebase.mockResolvedValue(false);
    const data = createData();
    const { result } = renderHook(() => useSessionJoinActions(data), {
      wrapper: ({ children }: PropsWithChildren) => createElement(RouterTestWrapper, null, children),
    })

    await act(async () => {
      await result.current.handleJoin();
    });

    expect(data.setIsJoining).toHaveBeenNthCalledWith(1, true);
    expect(data.setIsJoining).toHaveBeenNthCalledWith(2, false);
    expect(data.setError).toHaveBeenLastCalledWith('Firebase is unavailable. Please try again.');
    expect(data.setState).toHaveBeenLastCalledWith('preview');
    expect(sessionMocks.claimSessionSlot).not.toHaveBeenCalled();
  });
});
