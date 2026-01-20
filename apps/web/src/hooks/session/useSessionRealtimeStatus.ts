/**
 * useSessionRealtimeStatus Hook (REQ-106)
 *
 * Uses Firestore onSnapshot for real-time session status updates.
 * Much more efficient than polling: ~2 reads total vs ~720 reads/hour per guest.
 *
 * Requires user to be a member of the session (after claimSessionSlot).
 */

import { useState, useEffect, useRef } from 'react';
import type { SessionResultInfo } from '../../services/session/types';

type SessionStatus = 'open' | 'closed' | 'expired';

export interface SessionRealtimeState {
  /** Current session status */
  status: SessionStatus;
  /** Share mode (quick/detailed) */
  shareMode?: 'quick' | 'detailed';
  /** Whether guests should see Other Participants' Picks (detailed share only) */
  showOtherParticipantsPicks?: boolean;
  /** Selected game (can be present even while status is 'open') */
  selectedGame?: SessionResultInfo;
  /** Tonight's Pick result (only when status is 'closed') */
  result?: SessionResultInfo;
  /** Whether currently listening */
  connected: boolean;
  /** Error if listener failed */
  error: Error | null;
}

interface UseSessionRealtimeStatusOptions {
  /** Session ID to monitor */
  sessionId: string;
  /** Whether listening is enabled (defaults to true) */
  enabled?: boolean;
}

/**
 * Listen to session status changes in real-time via Firestore onSnapshot.
 * Falls back to 'open' status until connection is established.
 */
export function useSessionRealtimeStatus({
  sessionId,
  enabled = true,
}: UseSessionRealtimeStatusOptions): SessionRealtimeState {
  const [state, setState] = useState<SessionRealtimeState>({
    status: 'open',
    shareMode: undefined,
    showOtherParticipantsPicks: undefined,
    selectedGame: undefined,
    result: undefined,
    connected: false,
    error: null,
  });

  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled || !sessionId) {
      setState((prev) => ({ ...prev, connected: false }));
      return;
    }

    let cancelled = false;

    async function setupListener() {
      try {
        // Ensure Firebase is initialized before accessing Firestore
        const { initializeFirebase, getFirestoreInstance } = await import(
          '../../services/firebase/init'
        );
        const ready = await initializeFirebase();
        if (!ready) {
          throw new Error('Firebase initialization failed');
        }
        
        const { doc, onSnapshot } = await import('firebase/firestore');

        const firestore = getFirestoreInstance();
        if (!firestore) {
          throw new Error('Firestore not initialized');
        }

        if (cancelled) return;

        const sessionRef = doc(firestore, 'sessions', sessionId);

        unsubscribeRef.current = onSnapshot(
          sessionRef,
          (snapshot) => {
            if (cancelled) return;

            if (!snapshot.exists()) {
              setState({
                status: 'expired',
                selectedGame: undefined,
                result: undefined,
                connected: true,
                error: null,
              });
              return;
            }

            const data = snapshot.data();
            const status = (data?.status as SessionStatus) ?? 'open';
            const shareMode = (data?.shareMode as 'quick' | 'detailed' | undefined) ?? undefined;
            // Back-compat: if the field is missing on an older detailed session, default to true.
            const showOtherParticipantsPicksRaw = data?.showOtherParticipantsPicks as boolean | undefined;
            const showOtherParticipantsPicks =
              shareMode === 'quick'
                ? false
                : showOtherParticipantsPicksRaw !== false;
            const selectedGame = data?.selectedGame as SessionResultInfo | undefined;
            const result = data?.result as SessionResultInfo | undefined;

            setState({
              status,
              shareMode,
              showOtherParticipantsPicks,
              selectedGame,
              result,
              connected: true,
              error: null,
            });
          },
          (error) => {
            if (cancelled) return;
            console.warn('[useSessionRealtimeStatus] Listener error:', error);
            setState((prev) => ({
              ...prev,
              connected: false,
              error: error instanceof Error ? error : new Error(String(error)),
            }));
          }
        );
      } catch (err) {
        if (cancelled) return;
        console.warn('[useSessionRealtimeStatus] Setup failed:', err);
        setState((prev) => ({
          ...prev,
          connected: false,
          error: err instanceof Error ? err : new Error(String(err)),
        }));
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
  }, [sessionId, enabled]);

  return state;
}
