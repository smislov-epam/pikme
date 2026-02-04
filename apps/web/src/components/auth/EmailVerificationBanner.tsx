/**
 * Email Verification Banner (REQ-111)
 *
 * Banner shown to users who haven't verified their email.
 * Allows resending verification email.
 */

import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
  Link,
  Typography,
} from '@mui/material';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import { sendVerificationEmail } from '../../services/firebase';
import { getFirebaseFeatureConfig } from '../../services/firebase/config';

interface EmailVerificationBannerProps {
  email?: string;
}

export function EmailVerificationBanner({ email }: EmailVerificationBannerProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const featureConfig = getFirebaseFeatureConfig();
  const isEmulatorMode = featureConfig.useEmulators;
  const emulatorAuthUrl = isEmulatorMode
    ? `http://${featureConfig.emulatorHost}:${featureConfig.authPort}`
    : null;

  const handleResend = async () => {
    setSending(true);
    setError(null);
    try {
      await sendVerificationEmail();
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification email');
    } finally {
      setSending(false);
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Alert
        severity="warning"
        icon={<MailOutlineIcon />}
        action={
          !sent && (
            <Button
              color="inherit"
              size="small"
              onClick={handleResend}
              disabled={sending}
              startIcon={sending ? <CircularProgress size={14} /> : undefined}
            >
              {sending ? 'Sending...' : 'Resend'}
            </Button>
          )
        }
      >
        Please verify your email{email ? ` (${email})` : ''} to access all features.
      </Alert>

      <Collapse in={sent}>
        <Alert severity="success" sx={{ mt: 1 }}>
          {isEmulatorMode ? (
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Verification email triggered! In emulator mode, open the Auth Emulator UI to find the verification link:
              </Typography>
              <Link
                href={emulatorAuthUrl!}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ fontWeight: 'medium' }}
              >
                Open Auth Emulator UI →
              </Link>
            </Box>
          ) : (
            'Verification email sent! Check your inbox and spam folder.'
          )}
        </Alert>
      </Collapse>

      <Collapse in={!!error}>
        <Alert severity="error" sx={{ mt: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      </Collapse>
    </Box>
  );
}
