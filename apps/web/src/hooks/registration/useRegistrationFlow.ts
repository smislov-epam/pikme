/**
 * useRegistrationFlow (REQ-101)
 * Encapsulates invite parsing, auth gating, and redemption side-effects so the RegistrationPage can stay presentational.
 */
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../useAuth';
import {
  redeemRegistrationInvite,
  getRegistrationErrorCode,
  RegistrationErrorCodes,
} from '../../services/firebase';
import { linkLocalOwnerToFirebase, createLocalOwner } from '../useLocalOwner';
import { getLocalOwner } from '../../services/db/localOwnerService';

type RegistrationStep = 'loading' | 'create-account' | 'redeeming' | 'success' | 'error';
interface RegistrationState {
  step: RegistrationStep;
  email: string;
  displayName: string;
  password: string;
  confirmPassword: string;
  error: string | null;
}

function getErrorMessage(error: unknown): string {
  const code = getRegistrationErrorCode(error);

  switch (code) {
    case RegistrationErrorCodes.INVALID_INVITE:
      return 'This invite link is invalid. Please check the link or request a new one.';
    case RegistrationErrorCodes.EXPIRED_INVITE:
      return 'This invite has expired. Please request a new invite.';
    case RegistrationErrorCodes.INVITE_EXHAUSTED:
      return 'This invite has already been used the maximum number of times.';
    case RegistrationErrorCodes.INVITE_REVOKED:
      return 'This invite has been revoked and can no longer be used.';
    case RegistrationErrorCodes.ALREADY_REGISTERED:
      return 'You are already registered! You can close this page.';
    default:
      if (error instanceof Error) {
        if (error.message.includes('email-already-in-use')) {
          return 'An account with this email already exists. Try signing in instead.';
        }
        if (error.message.includes('weak-password')) {
          return 'Password is too weak. Please use at least 6 characters.';
        }
        if (error.message.includes('invalid-email')) {
          return 'Please enter a valid email address.';
        }
        return error.message;
      }
      return 'An unexpected error occurred. Please try again.';
  }
}

export function useRegistrationFlow() {
  const { user, loading: authLoading, firebaseReady, createAccount } = useAuth();
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [state, setState] = useState<RegistrationState>({ step: 'loading', email: '', displayName: '', password: '', confirmPassword: '', error: null });
  const displayNameRef = useRef('');

  // Extract token from URL once
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    setInviteToken(token);

    if (!token) {
      setState((s) => ({
        ...s,
        step: 'error',
        error: 'No invite token found. Please use the full invite link.',
      }));
    }
  }, []);

  // Keep latest display name without re-running effects
  useEffect(() => {
    displayNameRef.current = state.displayName;
  }, [state.displayName]);

  // Auth + redemption side-effect
  useEffect(() => {
    let cancelled = false;
    const setSafeState = (updater: (prev: RegistrationState) => RegistrationState) => {
      if (!cancelled) setState(updater);
    };

    if (authLoading) return undefined;
    if (!inviteToken) return undefined;

    if (!firebaseReady) {
      setSafeState((s) => ({
        ...s,
        step: 'error',
        error: 'Firebase is not available. Please try again later.',
      }));
      return undefined;
    }

    if (user) {
      void redeemInviteAsync();
    } else {
      setSafeState((s) => ({ ...s, step: 'create-account' }));
    }

    async function redeemInviteAsync() {
      if (!inviteToken || !user) return;

      setSafeState((s) => ({ ...s, step: 'redeeming', error: null }));

      try {
        await redeemRegistrationInvite(inviteToken);

        try {
          const localOwner = await getLocalOwner();
          if (localOwner) {
            await linkLocalOwnerToFirebase(user.uid);
          } else {
            await createLocalOwner({
              displayName: user.displayName || displayNameRef.current || 'User',
            });
            await linkLocalOwnerToFirebase(user.uid);
          }
        } catch (linkError) {
          console.warn('Failed to link local owner:', linkError);
        }

        setSafeState((s) => ({ ...s, step: 'success' }));
      } catch (error) {
        setSafeState((s) => ({
          ...s,
          step: 'error',
          error: getErrorMessage(error),
        }));
      }
    }

    return () => {
      cancelled = true;
    };
  }, [authLoading, firebaseReady, inviteToken, user]);

  const setEmail = useCallback((email: string) => {
    setState((s) => ({ ...s, email, error: null }));
  }, []);

  const setDisplayName = useCallback((displayName: string) => {
    setState((s) => ({ ...s, displayName, error: null }));
  }, []);

  const setPassword = useCallback((password: string) => {
    setState((s) => ({ ...s, password, error: null }));
  }, []);

  const setConfirmPassword = useCallback((confirmPassword: string) => {
    setState((s) => ({ ...s, confirmPassword, error: null }));
  }, []);

  const handleCreateAccount = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (state.password !== state.confirmPassword) {
        setState((s) => ({ ...s, error: 'Passwords do not match' }));
        return;
      }

      if (state.password.length < 6) {
        setState((s) => ({ ...s, error: 'Password must be at least 6 characters' }));
        return;
      }

      if (!state.displayName.trim()) {
        setState((s) => ({ ...s, error: 'Display name is required' }));
        return;
      }

      setState((s) => ({ ...s, error: null }));

      try {
        await createAccount(state.email, state.password, state.displayName.trim());
        // Auth state change will trigger invite redemption
      } catch (error) {
        setState((s) => ({ ...s, error: getErrorMessage(error) }));
      }
    },
    [createAccount, state]
  );

  return {
    state,
    authLoading,
    setEmail,
    setDisplayName,
    setPassword,
    setConfirmPassword,
    handleCreateAccount,
  };
}
