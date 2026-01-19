/**
 * useSessionReadyStatus Hook (REQ-106, REQ-107)
 *
 * Polls session member ready status for real-time updates.
 * Uses polling via Cloud Functions since direct Firestore access is not available.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSessionMembers } from '../../services/session';
import type { SessionMemberInfo } from '../../services/session/types';

/** Polling interval in milliseconds */
const POLL_INTERVAL_MS = 5000;

interface UseSessionReadyStatusOptions {
  /** Session ID to monitor */
  sessionId: string | null;
  /** Whether polling is enabled (defaults to true) */
  enabled?: boolean;
  /** Polling interval in ms (defaults to 5000) */
  pollInterval?: number;
}

interface UseSessionReadyStatusResult {
  /** Current list of session members */
  members: SessionMemberInfo[];
  /** Whether all members are ready */
  allReady: boolean;
  /** Loading state */
  loading: boolean;
  /** Error if any */
  error: Error | null;
  /** Manually refresh status */
  refresh: () => Promise<void>;
}

/**
 * Hook to poll session member ready status.
 */
export function useSessionReadyStatus({
  sessionId,
  enabled = true,
  pollInterval = POLL_INTERVAL_MS,
}: UseSessionReadyStatusOptions): UseSessionReadyStatusResult {
  const [members, setMembers] = useState<SessionMemberInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  const fetchMembers = useCallback(async () => {
    if (!sessionId || !isMountedRef.current) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getSessionMembers(sessionId);
      if (isMountedRef.current) {
        setMembers(data);
      }
    } catch (err) {
      if (isMountedRef.current) {
        const error = err instanceof Error ? err : new Error('Failed to fetch members');
        setError(error);
        console.warn('[useSessionReadyStatus] Failed to fetch members:', error.message);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [sessionId]);

  // Initial fetch and polling
  useEffect(() => {
    isMountedRef.current = true;
    
    if (!sessionId || !enabled) {
      setMembers([]);
      return;
    }

    // Initial fetch
    fetchMembers();

    // Set up polling
    const intervalId = setInterval(fetchMembers, pollInterval);

    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [sessionId, enabled, pollInterval, fetchMembers]);

  const allReady = members.length > 0 && members.every((m) => m.ready);

  return {
    members,
    allReady,
    loading,
    error,
    refresh: fetchMembers,
  };
}
