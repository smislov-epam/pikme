/**
 * Request Access Dialog (REQ-111)
 *
 * Dialog for unauthenticated users to request registration access.
 * Follows ui-ux-guidelines.md section 9 (Dialog and form guidelines).
 * Responsive design with fullScreen on mobile.
 */

import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { requestRegistrationInvite } from '../../services/registration';
import { getRecaptchaToken } from '../../services/recaptcha';
import { DialogHeader } from '../ui/DialogHeader';

export interface RequestAccessDialogProps {
  open: boolean;
  onClose: () => void;
  onContinueAsGuest?: () => void;
}

type DialogStep = 'form' | 'submitting' | 'success' | 'error';

export function RequestAccessDialog({
  open,
  onClose,
  onContinueAsGuest,
}: RequestAccessDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [step, setStep] = useState<DialogStep>('form');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Validation states
  const [emailError, setEmailError] = useState<string | null>(null);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);

  const resetForm = () => {
    setStep('form');
    setEmail('');
    setDisplayName('');
    setMessage('');
    setError(null);
    setEmailError(null);
    setDisplayNameError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value.trim()) {
      setEmailError('Email is required');
      return false;
    }
    if (!emailRegex.test(value.trim())) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const validateDisplayName = (value: string): boolean => {
    const trimmed = value.trim();
    if (!trimmed) {
      setDisplayNameError('Display name is required');
      return false;
    }
    if (trimmed.length < 2) {
      setDisplayNameError('Display name must be at least 2 characters');
      return false;
    }
    if (trimmed.length > 50) {
      setDisplayNameError('Display name must be 50 characters or less');
      return false;
    }
    setDisplayNameError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const isEmailValid = validateEmail(email);
    const isDisplayNameValid = validateDisplayName(displayName);

    if (!isEmailValid || !isDisplayNameValid) {
      return;
    }

    setStep('submitting');
    setError(null);

    try {
      // Get reCAPTCHA token (returns empty string if not configured)
      const recaptchaToken = await getRecaptchaToken('request_access');

      await requestRegistrationInvite({
        email: email.trim(),
        displayName: displayName.trim(),
        message: message.trim(),
        recaptchaToken,
      });
      setStep('success');
    } catch (err) {
      setStep('error');
      if (err instanceof Error) {
        // Handle specific error codes
        if (err.message.includes('duplicate-email')) {
          setError('An account with this email already exists.');
        } else if (err.message.includes('duplicate-request')) {
          setError('A request for this email is already pending.');
        } else if (err.message.includes('rate-limited')) {
          setError('Too many requests. Please try again later.');
        } else if (err.message.includes('recently-rejected')) {
          setError('Your previous request was recently declined. Please try again later.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to submit request. Please try again.');
      }
    }
  };

  const handleContinueAsGuest = () => {
    handleClose();
    onContinueAsGuest?.();
  };

  // Success state
  if (step === 'success') {
    return (
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogHeader
          icon={<CheckCircleIcon />}
          title="Request Submitted"
          variant="success"
        />
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Alert severity="success">
              Your request has been submitted successfully!
            </Alert>
            <Typography>
              An admin will review your request and share an invite link with you.
              In the meantime, you can still use PIKME as a guest to join
              game nights hosted by others.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose}>Close</Button>
          {onContinueAsGuest && (
            <Button
              variant="contained"
              onClick={handleContinueAsGuest}
            >
              Continue as Guest
            </Button>
          )}
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
    >
      <DialogHeader
        icon={<PersonAddIcon />}
        title="Request Access"
      />
      <DialogContent sx={{ pb: isMobile ? 2 : undefined }}>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Fill out this form to request host access to PIKME.
            An admin will review your request and you'll receive an email
            with further instructions.
          </Typography>

          {(step === 'error' && error) && (
            <Alert severity="error">{error}</Alert>
          )}

          <Box component="form" id="request-access-form" onSubmit={handleSubmit}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) validateEmail(e.target.value);
              }}
              onBlur={(e) => validateEmail(e.target.value)}
              error={!!emailError}
              helperText={emailError}
              disabled={step === 'submitting'}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Display Name"
              fullWidth
              required
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                if (displayNameError) validateDisplayName(e.target.value);
              }}
              onBlur={(e) => validateDisplayName(e.target.value)}
              error={!!displayNameError}
              helperText={displayNameError || 'This is how others will see you'}
              disabled={step === 'submitting'}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Why would you like to join? (optional)"
              fullWidth
              multiline
              rows={isMobile ? 2 : 3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={step === 'submitting'}
              inputProps={{ maxLength: 500 }}
              helperText={`${message.length}/500`}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={step === 'submitting'}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="request-access-form"
          variant="contained"
          disabled={step === 'submitting'}
          startIcon={step === 'submitting' ? <CircularProgress size={16} /> : null}
        >
          {step === 'submitting' ? 'Submitting...' : 'Submit Request'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
