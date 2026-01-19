/**
 * useSessionGuests Hook (REQ-103, REQ-108)
 *
 * Hook for the host to fetch and refresh guest preferences.
 * Uses Firestore real-time listener for cost-efficient updates.
 *
 * Cost optimization (REQ-108):
 * - Before: Polling every 10s = 180 function calls per 30min session
 * - After: Real-time listener = ~6 reads per session
 * - Savings: 97% reduction in Firebase costs
 */

import { useState, useCallback, useEffect } from 'react';
import { useSessionMembersListener } from './session/useSessionMembersListener';
import type { GuestPreferencesData, SharedGamePreference } from '../services/session/types';
import type { UserRecord, UserPreferenceRecord } from '../db/types';

export interface SessionGuest {
  /** User record for the guest (for wizard compatibility) */
  user: UserRecord;
  /** Session participant id (named slot id or open slot id) */
  participantId: string;
  /** Guest's preferences */
  preferences: UserPreferenceRecord[];
  /** Whether guest is ready */
  ready: boolean;
  /** When preferences were last updated */
  updatedAt: Date | null;
}

export interface UseSessionGuestsResult {
  /** Array of session guests */
  guests: SessionGuest[];
  /** Whether data is loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Refresh guests from Firebase */
  refresh: () => Promise<void>;
}

/**
 * Convert Firebase guest data to wizard-compatible format.
 */
function convertToSessionGuest(data: GuestPreferencesData): SessionGuest {
  const username = `__guest_${data.uid}__`;
  return {
    user: {
      username,
      internalId: data.uid,
      displayName: data.displayName,
      isBggUser: false,
    },
    participantId: data.participantId,
    preferences: data.preferences.map((p: SharedGamePreference) => ({
      username,
      bggId: p.bggId,
      rank: p.rank ?? undefined,
      isTopPick: p.isTopPick ?? false,
      isDisliked: p.isDisliked ?? false,
      updatedAt: data.updatedAt || new Date().toISOString(),
    })),
    ready: data.ready,
    updatedAt: data.updatedAt ? new Date(data.updatedAt) : null,
  };
}

/**
 * Hook to fetch and manage session guests for the host.
 * Uses real-time Firestore listener instead of polling.
 *
 * @param sessionId The session ID (null if no active session)
 * @param _pollInterval Deprecated - kept for API compatibility, ignored
 */
export function useSessionGuests(
  sessionId: string | null,
  _pollInterval = 10000
): UseSessionGuestsResult {
  void _pollInterval
  const { guestData, isLoading, error: listenerError, connected } = 
    useSessionMembersListener(sessionId);
  const [guests, setGuests] = useState<SessionGuest[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Convert listener data to SessionGuest format
  useEffect(() => {
    setGuests(guestData.map(convertToSessionGuest));
  }, [guestData]);

  // Sync error state
  useEffect(() => {
    setError(listenerError?.message ?? null);
  }, [listenerError]);

  // Manual refresh - fetches once from Cloud Function (for backwards compat)
  const refresh = useCallback(async () => {
    if (!sessionId) return;

    try {
      const { getAllGuestPreferences } = await import('../services/session');
      const data = await getAllGuestPreferences(sessionId);
      setGuests(data.map(convertToSessionGuest));
    } catch (err) {
      console.error('[useSessionGuests] Manual refresh failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch guests');
    }
  }, [sessionId]);

  // Log connection status for debugging
  useEffect(() => {
    if (sessionId && connected) {
      console.debug('[useSessionGuests] Real-time listener connected for session:', sessionId);
    }
  }, [sessionId, connected]);

  return {
    guests,
    isLoading,
    error,
    refresh,
  };
}
