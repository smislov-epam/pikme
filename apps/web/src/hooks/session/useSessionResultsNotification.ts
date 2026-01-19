/**
 * useSessionResultsNotification Hook (REQ-106, REQ-107)
 *
 * Monitors session status and shows a toast when host reveals results.
 * Uses polling since direct Firestore access is not available.
 */

import { useEffect, useRef, useCallback } from 'react';
import { getSessionPreview } from '../../services/session';
import { toast } from '../../services/toast';

/** Polling interval in milliseconds */
const POLL_INTERVAL_MS = 5000;

/** Maximum consecutive errors before reducing poll frequency */
const MAX_CONSECUTIVE_ERRORS = 3;

interface UseSessionResultsNotificationOptions {
  /** Session ID to monitor */
  sessionId: string | null;
  /** Whether monitoring is enabled (only for guests) */
  enabled?: boolean;
  /** Callback when results are revealed */
  onResultsRevealed?: () => void;
}

/**
 * Hook to monitor session status and notify when results are revealed.
 * Only active for guests (not the host).
 */
export function useSessionResultsNotification({
  sessionId,
  enabled = true,
  onResultsRevealed,
}: UseSessionResultsNotificationOptions): void {
  const lastStatusRef = useRef<'open' | 'closed' | 'expired' | null>(null);
  const hasNotifiedRef = useRef(false);
  const isMountedRef = useRef(true);
  const errorCountRef = useRef(0);

  const checkStatus = useCallback(async () => {
    if (!sessionId || hasNotifiedRef.current || !isMountedRef.current) return;

    try {
      const preview = await getSessionPreview(sessionId);
      
      // Reset error count on success
      errorCountRef.current = 0;
      
      if (!isMountedRef.current) return;
      
      // If status changed to closed and we haven't notified yet
      if (
        lastStatusRef.current === 'open' &&
        preview.status === 'closed' &&
        !hasNotifiedRef.current
      ) {
        hasNotifiedRef.current = true;
        toast.info("🎲 Host has revealed Tonight's Pick!", {
          autoHideMs: 8000,
        });
        onResultsRevealed?.();
      }
      
      lastStatusRef.current = preview.status;
    } catch (err) {
      // Log error for debugging but continue polling
      errorCountRef.current++;
      if (errorCountRef.current <= MAX_CONSECUTIVE_ERRORS) {
        console.warn(
          `[useSessionResultsNotification] Failed to check session status (attempt ${errorCountRef.current}):`,
          err instanceof Error ? err.message : err
        );
      }
      // After too many errors, just log occasionally
      if (errorCountRef.current === MAX_CONSECUTIVE_ERRORS) {
        console.warn('[useSessionResultsNotification] Too many errors, reducing log frequency');
      }
    }
  }, [sessionId, onResultsRevealed]);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (!sessionId || !enabled) {
      lastStatusRef.current = null;
      hasNotifiedRef.current = false;
      errorCountRef.current = 0;
      return;
    }

    // Initial check
    checkStatus();

    // Set up polling
    const intervalId = setInterval(checkStatus, POLL_INTERVAL_MS);

    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [sessionId, enabled, checkStatus]);
}
