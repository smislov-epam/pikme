/**
 * useSessionMembersListener Hook (REQ-108)
 *
 * Real-time Firestore listener for session members.
 * Replaces polling for host guest updates - massive cost reduction.
 *
 * Cost comparison:
 * - Polling every 10s for 30min = 180 function invocations
 * - Listener = 1 read + ~5 updates = 6 reads
 * - Savings: 97% reduction in Firebase costs
 */

import { useState, useEffect, useRef } from 'react';
import type { GuestPreferencesData } from '../../services/session/types';

type GuestPreferencesDataWithLocalFlag = GuestPreferencesData & {
  __isLocalUser: boolean;
};

function coerceToIsoString(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();

  // Firestore Timestamp (client/admin) has toDate().
  if (typeof (value as { toDate?: unknown }).toDate === 'function') {
    try {
      const date = (value as { toDate: () => Date }).toDate();
      return date.toISOString();
    } catch {
      return null;
    }
  }

  // Fallback for timestamp-like objects.
  const maybeSeconds = (value as { seconds?: unknown }).seconds;
  if (typeof maybeSeconds === 'number' && Number.isFinite(maybeSeconds)) {
    return new Date(maybeSeconds * 1000).toISOString();
  }

  return null;
}

interface UseSessionMembersListenerResult {
  /** Guest preferences data from Firebase */
  guestData: GuestPreferencesData[];
  /** Whether listener is active */
  connected: boolean;
  /** Whether initial load is in progress */
  isLoading: boolean;
  /** Error if listener failed */
  error: Error | null;
}

/**
 * Listen to guest preferences changes in real-time via Firestore onSnapshot.
 * Monitors the guestPreferences subcollection for updates.
 */
export function useSessionMembersListener(
  sessionId: string | null
): UseSessionMembersListenerResult {
  const [guestData, setGuestData] = useState<GuestPreferencesData[]>([]);
  const [connected, setConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Clean up previous listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Reset state when sessionId changes
    setGuestData([]);
    setConnected(false);
    setError(null);

    if (!sessionId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let cancelled = false;

    // Capture sessionId for use in async function (TypeScript narrowing)
    const currentSessionId = sessionId;

    async function setupListener() {
      try {
        const { getFirestoreInstance } = await import(
          '../../services/firebase/init'
        );
        const { collection, onSnapshot, query, orderBy } = await import(
          'firebase/firestore'
        );

        const firestore = getFirestoreInstance();
        if (!firestore) {
          throw new Error('Firestore not initialized');
        }

        if (cancelled) return;

        // Listen to guestPreferences subcollection
        const guestPrefsRef = collection(
          firestore,
          'sessions',
          currentSessionId,
          'guestPreferences'
        );
        const guestPrefsQuery = query(guestPrefsRef, orderBy('updatedAt', 'desc'));

        console.debug('[useSessionMembersListener] Setting up listener for session:', currentSessionId);

        unsubscribeRef.current = onSnapshot(
          guestPrefsQuery,
          (snapshot) => {
            if (cancelled) return;

            console.debug('[useSessionMembersListener] Snapshot received, docs:', snapshot.docs.length);

            const guests: GuestPreferencesData[] = snapshot.docs
              .map((doc) => {
                const data = doc.data();
                console.debug('[useSessionMembersListener] Doc:', doc.id, 'participantId:', data.participantId, 'isLocalUser:', data.isLocalUser);
                return {
                  uid: data.uid || doc.id,
                  displayName: data.displayName || 'Guest',
                  participantId: data.participantId || doc.id,
                  preferences: data.preferences || [],
                  ready: data.ready ?? false,
                  updatedAt: coerceToIsoString(data.updatedAt),
                  __isLocalUser:
                    (typeof (data as { isLocalUser?: unknown }).isLocalUser === 'boolean'
                      ? (data as { isLocalUser?: boolean }).isLocalUser
                      : false) === true,
                } satisfies GuestPreferencesDataWithLocalFlag;
              })
              .filter((g) => {
                // Drop host doc (participantId starts with host-)
                if (g.participantId.startsWith('host-')) return false;
                // Drop host-submitted local users (they are shown as local tabs already)
                if ((g as GuestPreferencesDataWithLocalFlag).__isLocalUser === true) return false;
                return true;
              })
              .map((g) => {
                // Remove the internal marker.
                const { __isLocalUser, ...rest } = g as GuestPreferencesDataWithLocalFlag;
                void __isLocalUser
                return rest;
              });

            console.debug('[useSessionMembersListener] Filtered guests:', guests.length);
            setGuestData(guests);
            setConnected(true);
            setIsLoading(false);
            setError(null);
          },
          (err) => {
            if (cancelled) return;
            console.error('[useSessionMembersListener] Error:', err);
            setError(err);
            setConnected(false);
            setIsLoading(false);
          }
        );
      } catch (err) {
        if (cancelled) return;
        console.error('[useSessionMembersListener] Setup error:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      }
    }

    setupListener();

    return () => {
      cancelled = true;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [sessionId]);

  return { guestData, connected, isLoading, error };
}
