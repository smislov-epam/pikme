/**
 * Login Page (REQ-101)
 *
 * Simple sign-in page for registered users.
 */

import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Link,
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const { signIn, firebaseReady } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signIn(email, password);
      // Redirect to home on success
      window.location.href = '/';
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('user-not-found') || err.message.includes('wrong-password')) {
          setError('Invalid email or password');
        } else if (err.message.includes('invalid-email')) {
          setError('Please enter a valid email address');
        } else {
          setError(err.message);
        }
      } else {
        setError('Sign in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!firebaseReady) {
    return (
      <LoginLayout>
        <Alert severity="info">
          Firebase is not available. Sign-in requires Firebase to be enabled.
        </Alert>
        <Typography sx={{ mt: 2 }}>
          <Link href="/">Go to app</Link>
        </Typography>
      </LoginLayout>
    );
  }

  return (
    <LoginLayout>
      <Typography variant="h6" gutterBottom>
        Sign In
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Sign in with your registered account.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          label="Email"
          type="email"
          fullWidth
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          sx={{ mb: 2 }}
        />
        <TextField
          label="Password"
          type="password"
          fullWidth
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          sx={{ mb: 3 }}
        />
        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>
      </Box>

      <Typography sx={{ mt: 3, textAlign: 'center' }} color="text.secondary">
        <Link href="/">← Back to app</Link>
      </Typography>
    </LoginLayout>
  );
}

function LoginLayout({ children }: { children: React.ReactNode }) {
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
            PIKME
          </Typography>
          {children}
        </CardContent>
      </Card>
    </Box>
  );
}
