/**
 * useUserPermissions (REQ-111)
 *
 * Hook to check current user's permission state:
 * - Email verification status (from Firebase Auth)
 * - Disabled/revoked status (from Firestore users collection)
 *
 * Returns permission flags for conditional rendering of banners
 * and gating of features like session creation.
 */

import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import {
  getFirestoreInstance,
  isFirebaseInitialized,
} from '../services/firebase';

export interface UserPermissions {
  /** True while loading user status */
  isLoading: boolean;
  /** True if user is signed in (non-anonymous) */
  isAuthenticated: boolean;
  /** True if user's email is verified */
  emailVerified: boolean;
  /** True if user's access has been revoked by admin */
  isDisabled: boolean;
  /** True if user can create sessions (verified + not disabled) */
  canCreateSession: boolean;
  /** Refresh the permission state */
  refresh: () => void;
}

export function useUserPermissions(): UserPermissions {
  const { user, loading: authLoading, firebaseReady } = useAuth();
  const [isDisabled, setIsDisabled] = useState(false);
  const [firestoreLoading, setFirestoreLoading] = useState(true);

  const isAuthenticated = !!user;
  const emailVerified = user?.emailVerified ?? false;

  const checkDisabledStatus = async () => {
    if (!user || !isFirebaseInitialized()) {
      setIsDisabled(false);
      setFirestoreLoading(false);
      return;
    }

    setFirestoreLoading(true);
    try {
      const db = getFirestoreInstance();
      if (!db) {
        setIsDisabled(false);
        return;
      }

      const { doc, getDoc } = await import('firebase/firestore');
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      if (userDoc.exists()) {
        const data = userDoc.data();
        setIsDisabled(data?.disabled === true);
      } else {
        setIsDisabled(false);
      }
    } catch (error) {
      console.warn('Failed to check user status:', error);
      // Default to not disabled on error
      setIsDisabled(false);
    } finally {
      setFirestoreLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && firebaseReady && user) {
      checkDisabledStatus();
    } else if (!authLoading) {
      setFirestoreLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, authLoading, firebaseReady]);

  const isLoading = authLoading || firestoreLoading;

  // User can create sessions if:
  // - Signed in (authenticated)
  // - Email verified
  // - Not disabled/revoked
  const canCreateSession = isAuthenticated && emailVerified && !isDisabled;

  return {
    isLoading,
    isAuthenticated,
    emailVerified,
    isDisabled,
    canCreateSession,
    refresh: checkDisabledStatus,
  };
}
