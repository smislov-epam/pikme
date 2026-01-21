/**
 * Registration Page (REQ-101)
 * Presentational shell for invite-based registration.
 */

import type React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Link,
  TextField,
  Typography,
} from '@mui/material';
import { useRegistrationFlow } from '../hooks/registration/useRegistrationFlow';

export function RegistrationPage() {
  const {
    state,
    authLoading,
    setEmail,
    setDisplayName,
    setPassword,
    setConfirmPassword,
    handleCreateAccount,
  } = useRegistrationFlow();

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

  if (state.step === 'success') {
    return (
      <RegistrationLayout>
        <Alert severity="success" sx={{ mb: 2 }}>
          Registration successful! You are now a registered host.
        </Alert>
        <Typography>
          You can now <Link component={RouterLink} to="/">go to the app</Link> and create game sessions.
        </Typography>
      </RegistrationLayout>
    );
  }

  if (state.step === 'error') {
    return (
      <RegistrationLayout>
        <Alert severity="error" sx={{ mb: 2 }}>
          {state.error}
        </Alert>
        <Typography>
          <Link component={RouterLink} to="/">Go to the app</Link>
        </Typography>
      </RegistrationLayout>
    );
  }

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
          onChange={(e) => setEmail(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          label="Display Name"
          fullWidth
          required
          value={state.displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          helperText="This is how others will see you"
          sx={{ mb: 2 }}
        />
        <TextField
          label="Password"
          type="password"
          fullWidth
          required
          value={state.password}
          onChange={(e) => setPassword(e.target.value)}
          helperText="At least 6 characters"
          sx={{ mb: 2 }}
        />
        <TextField
          label="Confirm Password"
          type="password"
          fullWidth
          required
          value={state.confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
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
      <Card sx={{ maxWidth: 480, width: '100%' }}>
        <CardContent>{children}</CardContent>
      </Card>
    </Box>
  );
}
