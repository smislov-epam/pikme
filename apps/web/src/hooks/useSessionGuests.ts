/**
 * useSessionGuests Hook (REQ-103)
 *
 * Hook for the host to fetch and refresh guest preferences.
 * Provides guest list with their preferences for display in wizard tabs.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
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
 *
 * @param sessionId The session ID (null if no active session)
 * @param pollInterval How often to poll for updates (ms, default 10s)
 */
export function useSessionGuests(
  sessionId: string | null,
  pollInterval = 10000
): UseSessionGuestsResult {
  const [guests, setGuests] = useState<SessionGuest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!sessionId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { getAllGuestPreferences } = await import('../services/session');
      const data = await getAllGuestPreferences(sessionId);
      setGuests(data.map(convertToSessionGuest));
    } catch (err) {
      console.error('[useSessionGuests] Failed to fetch guests:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch guests');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  // Initial fetch and polling
  useEffect(() => {
    if (!sessionId) {
      setGuests([]);
      return;
    }

    // Initial fetch
    refresh();

    // Set up polling
    intervalRef.current = setInterval(refresh, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [sessionId, pollInterval, refresh]);

  return {
    guests,
    isLoading,
    error,
    refresh,
  };
}
