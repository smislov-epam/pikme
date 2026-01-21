/**
 * useActiveSessions (REQ-106)
 *
 * Hook for tracking and managing multiple active sessions.
 * Provides session list, navigation, and exit functionality.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { getSessionPreview } from '../services/session';

/** Information about an active session */
export interface ActiveSessionInfo {
  sessionId: string;
  title: string;
  hostName: string | null;
  hostUid: string;
  role: 'host' | 'guest';
  scheduledFor: string | null;
  status: 'open' | 'closed' | 'expired';
  /** Whether the current caller has marked Ready (guests only) */
  callerReady?: boolean;
  /** Selected game (can be present even while status is 'open') */
  selectedGame?: {
    gameId: string;
    name: string;
    thumbnail: string | null;
    image: string | null;
    score: number;
    minPlayers: number | null;
    maxPlayers: number | null;
    playingTimeMinutes: number | null;
  };
}

/** Key for storing active session IDs in localStorage */
const ACTIVE_SESSIONS_KEY = 'activeSessionIds';
const CURRENT_SESSION_KEY = 'activeSessionId';

/**
 * Get active session IDs from localStorage.
 */
function getStoredSessionIds(): string[] {
  try {
    const stored = localStorage.getItem(ACTIVE_SESSIONS_KEY);
    if (!stored) {
      // Backward compatibility: check for single activeSessionId
      const single = localStorage.getItem(CURRENT_SESSION_KEY);
      return single ? [single] : [];
    }
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Store active session IDs to localStorage.
 * Note: Does NOT auto-set activeSessionId - that should be managed explicitly
 * to avoid overriding user's chosen session (REQ-108 fix).
 */
function storeSessionIds(ids: string[]): void {
  if (ids.length === 0) {
    localStorage.removeItem(ACTIVE_SESSIONS_KEY);
    // Don't clear CURRENT_SESSION_KEY - let explicit setCurrentSession handle it
  } else {
    localStorage.setItem(ACTIVE_SESSIONS_KEY, JSON.stringify(ids));
    // REQ-108 FIX: Removed auto-setting first session as current.
    // This was causing user's explicitly chosen session to be overwritten.
    // The activeSessionId is now managed exclusively by setCurrentSession().
  }
}

export interface UseActiveSessionsResult {
  /** List of active sessions with metadata */
  sessions: ActiveSessionInfo[];
  /** Currently focused session ID */
  currentSessionId: string | null;
  /** Whether sessions are loading */
  isLoading: boolean;
  /** Add a session to active list */
  addSession: (sessionId: string) => void;
  /** Remove a session from active list */
  removeSession: (sessionId: string) => void;
  /** Set current/focused session */
  setCurrentSession: (sessionId: string) => void;
  /** Refresh session metadata */
  refreshSessions: () => Promise<void>;
}

export function useActiveSessions(): UseActiveSessionsResult {
  const [sessionIds, setSessionIds] = useState<string[]>(() => getStoredSessionIds());
  const [sessions, setSessions] = useState<ActiveSessionInfo[]>([]);
  const [currentSessionId, setCurrentSessionIdState] = useState<string | null>(
    () => localStorage.getItem(CURRENT_SESSION_KEY)
  );
  const [isLoading, setIsLoading] = useState(false);
  const { firebaseReady } = useAuth();

  // Sync sessionIds to localStorage
  useEffect(() => {
    storeSessionIds(sessionIds);
  }, [sessionIds]);

  // Sync currentSessionId to localStorage
  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem(CURRENT_SESSION_KEY, currentSessionId);
    } else {
      localStorage.removeItem(CURRENT_SESSION_KEY);
    }
  }, [currentSessionId]);

  // Fetch session metadata for all active sessions
  const refreshSessions = useCallback(async () => {
    if (!firebaseReady || sessionIds.length === 0) {
      setSessions([]);
      return;
    }

    setIsLoading(true);
    try {
      const sessionInfos = await Promise.all(
        sessionIds.map(async (sessionId) => {
          try {
            const preview = await getSessionPreview(sessionId);
            const isHost = preview.callerRole === 'host';
            const info: ActiveSessionInfo = {
              sessionId,
              title: preview.title,
              hostName: preview.hostName ?? null,
              hostUid: preview.hostUid ?? '',
              role: isHost ? 'host' : 'guest',
              callerReady: preview.callerReady,
              selectedGame: preview.selectedGame,
              scheduledFor: preview.scheduledFor
                ? preview.scheduledFor.toISOString()
                : null,
              status: preview.status,
            };
            return { info, status: preview.status };
          } catch (err) {
            console.warn(`[useActiveSessions] Failed to load session ${sessionId}:`, err);
            // Keep the session ID so we can retry later instead of dropping it on transient errors
            return { info: null, status: null };
          }
        })
      );

      const openSessions = sessionInfos
        .map((result) => result.info)
        .filter((s): s is ActiveSessionInfo => Boolean(s && s.status === 'open'));

      const closedOrExpiredIds = sessionInfos
        .filter((result) => result.info && result.info.status !== 'open')
        .map((result) => result.info!.sessionId);

      if (closedOrExpiredIds.length > 0) {
        setSessionIds((prev) => prev.filter((id) => !closedOrExpiredIds.includes(id)));
      }

      openSessions.sort((a, b) => {
        if (a.scheduledFor && b.scheduledFor) {
          return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
        }
        if (a.scheduledFor) return -1;
        if (b.scheduledFor) return 1;
        return a.title.localeCompare(b.title);
      });

      setSessions(openSessions);
    } catch (err) {
      console.error('[useActiveSessions] Failed to refresh sessions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [firebaseReady, sessionIds]);

  // Initial load and refresh when sessionIds change
  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  const addSession = useCallback((sessionId: string) => {
    setSessionIds((prev) => {
      if (prev.includes(sessionId)) return prev;
      return [...prev, sessionId];
    });
    setCurrentSessionIdState(sessionId);
  }, []);

  const removeSession = useCallback((sessionId: string) => {
    setSessionIds((prev) => prev.filter((id) => id !== sessionId));
    setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
    setCurrentSessionIdState((prev) => {
      if (prev === sessionId) {
        // Switch to another session or null
        const remaining = sessionIds.filter((id) => id !== sessionId);
        return remaining[0] ?? null;
      }
      return prev;
    });
    
    // Clean up session-specific localStorage
    const guestSessionId = localStorage.getItem('guestSessionId');
    if (guestSessionId === sessionId) {
      localStorage.removeItem('guestSessionId');
      localStorage.removeItem('guestDisplayName');
      localStorage.removeItem('guestParticipantId');
      localStorage.removeItem('guestClaimedNamedSlot');
      localStorage.removeItem('guestShareMode');
      localStorage.removeItem('guestMode');
      localStorage.removeItem('guestPreferenceSource');
      localStorage.removeItem('sessionGuestMode');
      sessionStorage.removeItem('guestInitialPreferences');
      sessionStorage.removeItem('guestSessionGameIds');
    }
  }, [sessionIds]);

  const setCurrentSession = useCallback((sessionId: string) => {
    if (sessionIds.includes(sessionId)) {
      setCurrentSessionIdState(sessionId);
    }
  }, [sessionIds]);

  return {
    sessions,
    currentSessionId,
    isLoading,
    addSession,
    removeSession,
    setCurrentSession,
    refreshSessions,
  };
}
