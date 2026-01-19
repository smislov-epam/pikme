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
  const [authUid, setAuthUid] = useState<string | null>(null);

  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Track auth state changes to retry listener when user signs in
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    async function subscribeToAuth() {
      try {
        const { initializeFirebase, getAuthInstance } = await import('../../services/firebase');
        const ready = await initializeFirebase();
        if (!ready) return;

        const auth = getAuthInstance();
        if (!auth) return;

        const { onAuthStateChanged } = await import('firebase/auth');
        unsubscribe = onAuthStateChanged(auth, (user) => {
          setAuthUid(user?.uid ?? null);
        });
      } catch {
        // Firebase not available
      }
    }
    
    subscribeToAuth();
    return () => unsubscribe?.();
  }, []);

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
        // Ensure Firebase is initialized before accessing Auth/Firestore singletons.
        const { initializeFirebase, getAuthInstance, getFirestoreInstance } = await import(
          '../../services/firebase'
        );
        const ready = await initializeFirebase();
        if (!ready) {
          // Firebase disabled/misconfigured; listener should be a no-op.
          setIsLoading(false);
          return;
        }

        const { collection, onSnapshot, query, orderBy, doc, getDoc } = await import(
          'firebase/firestore'
        );

        const auth = getAuthInstance();
        if (!auth?.currentUser) {
          // Not authenticated yet - silently skip listener setup
          // The listener will be retried when auth state changes
          console.debug('[useSessionMembersListener] No auth user, skipping listener');
          setIsLoading(false);
          return;
        }

        // Anonymous auth is used for guest/session flows.
        // Guest preferences are host-only, so anonymous users should never subscribe here.
        if (auth.currentUser.isAnonymous) {
          console.debug('[useSessionMembersListener] Anonymous user, skipping host-only listener');
          setIsLoading(false);
          return;
        }

        const firestore = getFirestoreInstance();
        if (!firestore) {
          // Should not happen if initializeFirebase() returned true, but keep it safe.
          setIsLoading(false);
          return;
        }

        if (cancelled) return;

        // Host-only guard: guestPreferences reads require the caller to be the session creator.
        // Only proceed if we can CONFIRM the user is the host; otherwise skip entirely.
        let isHost = false;
        let sessionCreatedByUid: string | undefined;
        try {
          const sessionRef = doc(firestore, 'sessions', currentSessionId);
          const sessionSnap = await getDoc(sessionRef);
          if (!sessionSnap.exists()) {
            console.debug('[useSessionMembersListener] Session does not exist, skipping listener');
            setIsLoading(false);
            return;
          }
          sessionCreatedByUid = (sessionSnap.data() as { createdByUid?: unknown })?.createdByUid as string | undefined;
          isHost = typeof sessionCreatedByUid === 'string' && sessionCreatedByUid === auth.currentUser.uid;
          console.debug('[useSessionMembersListener] Host check:', {
            sessionId: currentSessionId,
            createdByUid: sessionCreatedByUid,
            currentUid: auth.currentUser.uid,
            isHost,
          });
        } catch (err) {
          // Any error reading session means we can't verify host status → skip listener
          console.debug('[useSessionMembersListener] Could not verify host role, skipping listener:', err);
          setIsLoading(false);
          return;
        }

        if (!isHost) {
          console.debug('[useSessionMembersListener] Not session host, skipping guestPreferences listener');
          setIsLoading(false);
          return;
        }

        console.debug('[useSessionMembersListener] Host verified, currentUser.uid:', auth.currentUser.uid);

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
  }, [sessionId, authUid]); // Re-run when auth state changes

  return { guestData, connected, isLoading, error };
}
