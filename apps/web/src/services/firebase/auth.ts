/**
 * Firebase Auth Service (REQ-101)
 *
 * Authentication utilities for registration and sign-in.
 */

import type { User } from 'firebase/auth';
import { getAuthInstance, isFirebaseInitialized } from './init';

export type AuthUser = User;

/**
 * Get the current authenticated user (null if not signed in).
 */
export function getCurrentUser(): AuthUser | null {
  if (!isFirebaseInitialized()) return null;
  const auth = getAuthInstance();
  return auth?.currentUser ?? null;
}

/**
 * Sign in with email and password.
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthUser> {
  const auth = getAuthInstance();
  if (!auth) throw new Error('Firebase not initialized');

  const { signInWithEmailAndPassword } = await import('firebase/auth');
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

/**
 * Create a new account with email and password.
 */
export async function createAccountWithEmail(
  email: string,
  password: string,
  displayName?: string
): Promise<AuthUser> {
  const auth = getAuthInstance();
  if (!auth) throw new Error('Firebase not initialized');

  const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
  const credential = await createUserWithEmailAndPassword(auth, email, password);

  // Set display name if provided
  if (displayName) {
    await updateProfile(credential.user, { displayName });
  }

  return credential.user;
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<void> {
  const auth = getAuthInstance();
  if (!auth) return;

  const { signOut: firebaseSignOut } = await import('firebase/auth');
  await firebaseSignOut(auth);
}

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 * 
 * Uses a cancelled flag pattern to handle race conditions where the caller
 * unsubscribes before the dynamic import completes.
 */
export function onAuthStateChange(
  callback: (user: AuthUser | null) => void
): () => void {
  let cancelled = false;
  let unsubscribe: (() => void) | null = null;

  const auth = getAuthInstance();
  if (!auth) {
    // Firebase not initialized, call with null immediately (unless already cancelled)
    if (!cancelled) callback(null);
    return () => { cancelled = true; };
  }

  // Dynamic import to avoid bundling when not used
  import('firebase/auth').then(({ onAuthStateChanged }) => {
    // Don't subscribe if cleanup was called before import resolved
    if (cancelled) return;
    unsubscribe = onAuthStateChanged(auth, callback);
  });

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}
