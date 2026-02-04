/**
 * useAdminStatus Hook (REQ-111)
 *
 * Hook to check if the current user is an admin.
 * Forces a token refresh to ensure custom claims are up-to-date.
 */

import { useState, useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { checkAdminStatus } from '../services/admin';

interface AdminStatusResult {
  isAdmin: boolean;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to check admin status of the current user.
 * Forces a token refresh to get the latest custom claims.
 *
 * @returns Admin status, loading state, and error
 */
export function useAdminStatus(): AdminStatusResult {
  const { user, firebaseReady } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const checkedUidRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let authSettleTimer: ReturnType<typeof setTimeout> | null = null;

    async function checkStatus() {
      // Not ready yet - keep loading
      if (!firebaseReady) {
        return;
      }

      // No user - wait briefly for auth to settle, then mark as not admin
      if (!user) {
        authSettleTimer = setTimeout(() => {
          if (!cancelled) {
            setIsAdmin(false);
            setIsLoading(false);
            checkedUidRef.current = null;
          }
        }, 100);
        return;
      }

      // Already checked for this user - don't re-check
      if (checkedUidRef.current === user.uid) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Force token refresh to get latest custom claims
        await user.getIdToken(true);

        const adminStatus = await checkAdminStatus();
        if (!cancelled) {
          setIsAdmin(adminStatus);
          checkedUidRef.current = user.uid;
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[useAdminStatus] Error checking admin status:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to check admin status'));
          setIsAdmin(false);
          checkedUidRef.current = user.uid;
          setIsLoading(false);
        }
      }
    }

    checkStatus();

    // Cleanup: cancel pending operations and clear timer
    return () => {
      cancelled = true;
      if (authSettleTimer) {
        clearTimeout(authSettleTimer);
      }
    };
  }, [user, firebaseReady]);

  return { isAdmin, isLoading, error };
}
