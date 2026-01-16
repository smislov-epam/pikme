/**
 * useAuth Hook (REQ-101)
 *
 * React hook for Firebase authentication state.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  isFirebaseAvailable,
  initializeFirebase,
  onAuthStateChange,
  signInWithEmail,
  createAccountWithEmail,
  signOut as firebaseSignOut,
  type AuthUser,
} from '../services/firebase';

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
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

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
          setUser(authUser);
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
