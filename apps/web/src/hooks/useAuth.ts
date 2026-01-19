/**
 * useAuth Hook (REQ-101)
 *
 * React hook for Firebase authentication state.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  isFirebaseAvailable,
  initializeFirebase,
  onAuthStateChange,
  signInWithEmail,
  createAccountWithEmail,
  signOut as firebaseSignOut,
  type AuthUser,
} from '../services/firebase';
import { clearAllSessionStorage } from '../services/storage/wizardStateStorage';

/** Key for persisting the last authenticated user's UID */
const LAST_AUTH_UID_KEY = 'lastAuthUid';

export interface UseAuthState {
  /** Current authenticated user (null if not signed in) */
  user: AuthUser | null;
  /** True while checking initial auth state */
  loading: boolean;
  /** True if Firebase is available and initialized */
  firebaseReady: boolean;
  /** Error from last auth operation */
  error: Error | null;
}

export interface UseAuthActions {
  /** Sign in with email and password */
  signIn: (email: string, password: string) => Promise<AuthUser>;
  /** Create account with email, password, and optional display name */
  createAccount: (email: string, password: string, displayName?: string) => Promise<AuthUser>;
  /** Sign out */
  signOut: () => Promise<void>;
  /** Clear error */
  clearError: () => void;
}

export type UseAuthReturn = UseAuthState & UseAuthActions;

/**
 * Hook to manage Firebase authentication state.
 * Returns null-safe state even when Firebase is disabled.
 * 
 * Also handles clearing stale session storage when user changes
 * to prevent permission errors from cross-user localStorage pollution.
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Track if we've already cleared storage for the current auth transition
  const didClearForUserRef = useRef<string | null>(null);

  // Initialize Firebase and subscribe to auth state
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    async function init() {
      if (!isFirebaseAvailable()) {
        setLoading(false);
        return;
      }

      const success = await initializeFirebase();
      setFirebaseReady(success);

      if (success) {
        unsubscribe = onAuthStateChange((authUser) => {
          // Anonymous auth is used for guest/session flows.
          // It should not be treated as a "logged in / registered" user in the UI.
          const effectiveUser = authUser?.isAnonymous ? null : authUser;
          
          // Clear stale session storage when a different user signs in.
          // This prevents permission errors from localStorage pollution
          // (e.g., User A's session IDs persisting when User B logs in).
          if (effectiveUser) {
            const lastAuthUid = localStorage.getItem(LAST_AUTH_UID_KEY);
            if (lastAuthUid && lastAuthUid !== effectiveUser.uid) {
              // Different user signed in - clear stale session data
              console.log('[useAuth] User changed, clearing stale session storage');
              clearAllSessionStorage();
            }
            // Store current user's UID for future comparison
            localStorage.setItem(LAST_AUTH_UID_KEY, effectiveUser.uid);
            didClearForUserRef.current = effectiveUser.uid;
          }
          
          setUser(effectiveUser);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    }

    init();

    return () => {
      unsubscribe?.();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const authUser = await signInWithEmail(email, password);
      return authUser;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    }
  }, []);

  const createAccount = useCallback(async (email: string, password: string, displayName?: string) => {
    setError(null);
    try {
      const authUser = await createAccountWithEmail(email, password, displayName);
      return authUser;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    try {
      // Clear session storage before signing out to prevent stale data
      // from being accessed by subsequent users on this device
      console.log('[useAuth] Signing out, clearing session storage');
      clearAllSessionStorage();
      // Also clear the last auth UID so it doesn't interfere with fresh logins
      localStorage.removeItem(LAST_AUTH_UID_KEY);
      
      await firebaseSignOut();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    loading,
    firebaseReady,
    error,
    signIn,
    createAccount,
    signOut,
    clearError,
  };
}
