/**
 * Registration Page (REQ-101)
 *
 * Handles user registration via invite token.
 * Flow: User opens link → Creates account → Redeems invite → Becomes host-eligible.
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Link,
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import {
  redeemRegistrationInvite,
  getRegistrationErrorCode,
  RegistrationErrorCodes,
} from '../services/firebase';
import { linkLocalOwnerToFirebase, createLocalOwner } from '../hooks/useLocalOwner';
import { getLocalOwner } from '../services/db/localOwnerService';

type RegistrationStep = 'loading' | 'create-account' | 'redeeming' | 'success' | 'error';

interface RegistrationState {
  step: RegistrationStep;
  email: string;
  displayName: string;
  password: string;
  confirmPassword: string;
  error: string | null;
}

/**
 * Get user-friendly error message for registration errors.
 */
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
        // Handle Firebase Auth errors
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

export function RegistrationPage() {
  const { user, loading: authLoading, firebaseReady, createAccount } = useAuth();
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [state, setState] = useState<RegistrationState>({
    step: 'loading',
    email: '',
    displayName: '',
    password: '',
    confirmPassword: '',
    error: null,
  });

  // Extract token from URL on mount
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

  // Handle auth state changes
  useEffect(() => {
    if (authLoading) return;

    if (!firebaseReady) {
      setState((s) => ({
        ...s,
        step: 'error',
        error: 'Firebase is not available. Please try again later.',
      }));
      return;
    }

    if (!inviteToken) return;

    if (user) {
      // User is authenticated, try to redeem invite
      void redeemInviteAsync();
    } else {
      // Show account creation form
      setState((s) => ({ ...s, step: 'create-account' }));
    }

    async function redeemInviteAsync() {
      if (!inviteToken || !user) return;

      setState((s) => ({ ...s, step: 'redeeming', error: null }));

      try {
        await redeemRegistrationInvite(inviteToken);

        // Link local owner to Firebase UID (REQ-103 user journeys)
        try {
          const localOwner = await getLocalOwner();
          if (localOwner) {
            // Existing local owner - link to Firebase
            await linkLocalOwnerToFirebase(user.uid);
          } else {
            // No local owner yet - create one from Firebase profile
            await createLocalOwner({
              displayName: user.displayName || state.displayName || 'User',
            });
            await linkLocalOwnerToFirebase(user.uid);
          }
        } catch (linkError) {
          // Non-fatal - log but don't fail registration
          console.warn('Failed to link local owner:', linkError);
        }

        setState((s) => ({ ...s, step: 'success' }));
      } catch (error) {
        setState((s) => ({
          ...s,
          step: 'error',
          error: getErrorMessage(error),
        }));
      }
    }
  }, [authLoading, firebaseReady, user, inviteToken, state.displayName]);

  async function handleCreateAccount(e: React.FormEvent) {
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
  }

  // Render loading state
  if (state.step === 'loading' || authLoading) {
    return (
      <RegistrationLayout>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Loading...</Typography>
        </Box>
      </RegistrationLayout>
    );
  }

  // Render success state
  if (state.step === 'success') {
    return (
      <RegistrationLayout>
        <Alert severity="success" sx={{ mb: 2 }}>
          Registration successful! You are now a registered host.
        </Alert>
        <Typography>
          You can now <Link href="/">go to the app</Link> and create game sessions.
        </Typography>
      </RegistrationLayout>
    );
  }

  // Render error state
  if (state.step === 'error') {
    return (
      <RegistrationLayout>
        <Alert severity="error" sx={{ mb: 2 }}>
          {state.error}
        </Alert>
        <Typography>
          <Link href="/">Go to the app</Link>
        </Typography>
      </RegistrationLayout>
    );
  }

  // Render redeeming state
  if (state.step === 'redeeming') {
    return (
      <RegistrationLayout>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Activating your account...</Typography>
        </Box>
      </RegistrationLayout>
    );
  }

  // Render account creation form
  return (
    <RegistrationLayout>
      <Typography variant="h6" gutterBottom>
        Create Your Account
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        You've been invited to join PIKME as a host. Create an account to get started.
      </Typography>

      {state.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {state.error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleCreateAccount}>
        <TextField
          label="Email"
          type="email"
          fullWidth
          required
          value={state.email}
          onChange={(e) => setState((s) => ({ ...s, email: e.target.value }))}
          sx={{ mb: 2 }}
        />
        <TextField
          label="Display Name"
          fullWidth
          required
          value={state.displayName}
          onChange={(e) => setState((s) => ({ ...s, displayName: e.target.value }))}
          helperText="This is how others will see you"
          sx={{ mb: 2 }}
        />
        <TextField
          label="Password"
          type="password"
          fullWidth
          required
          value={state.password}
          onChange={(e) => setState((s) => ({ ...s, password: e.target.value }))}
          helperText="At least 6 characters"
          sx={{ mb: 2 }}
        />
        <TextField
          label="Confirm Password"
          type="password"
          fullWidth
          required
          value={state.confirmPassword}
          onChange={(e) => setState((s) => ({ ...s, confirmPassword: e.target.value }))}
          sx={{ mb: 3 }}
        />
        <Button type="submit" variant="contained" fullWidth size="large">
          Create Account
        </Button>
      </Box>
    </RegistrationLayout>
  );
}

function RegistrationLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            PIKME Registration
          </Typography>
          {children}
        </CardContent>
      </Card>
    </Box>
  );
}
