/**
 * Create Invite Dialog (REQ-111)
 *
 * Dialog for creating a new registration invite.
 * Follows ui-ux-guidelines.md section 9.1 for dialog structure.
 */

import { useState } from 'react';
import {
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
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import { DialogHeader } from '../ui/DialogHeader';

interface CreateInviteDialogProps {
  open: boolean;
  loading: boolean;
  onCreate: (email: string, displayName: string) => void;
  onCancel: () => void;
}

export function CreateInviteDialog({
  open,
  loading,
  onCreate,
  onCancel,
}: CreateInviteDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [touched, setTouched] = useState({ email: false, displayName: false });

  const handleClose = () => {
    if (loading) return;
    setEmail('');
    setDisplayName('');
    setTouched({ email: false, displayName: false });
    onCancel();
  };

  const handleCreate = () => {
    const trimmedEmail = email.trim();
    const trimmedDisplayName = displayName.trim();

    if (!trimmedEmail || !trimmedDisplayName) {
      setTouched({ email: true, displayName: true });
      return;
    }

    onCreate(trimmedEmail, trimmedDisplayName);
    setEmail('');
    setDisplayName('');
    setTouched({ email: false, displayName: false });
  };

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const emailError = touched.email && (!email.trim() || !isValidEmail(email));
  const nameError = touched.displayName && !displayName.trim();

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
    >
      <DialogHeader
        icon={<PersonAddAltIcon />}
        title="Create Registration Invite"
      />
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Create an invite link for a new user. They will receive an email
            with instructions to complete their registration.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            error={emailError}
            helperText={
              emailError
                ? !email.trim()
                  ? 'Email is required'
                  : 'Invalid email format'
                : ' '
            }
            disabled={loading}
          />
          <TextField
            fullWidth
            label="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, displayName: true }))}
            error={nameError}
            helperText={nameError ? 'Display name is required' : ' '}
            inputProps={{ maxLength: 100 }}
            disabled={loading}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={loading || !email.trim() || !displayName.trim()}
          startIcon={loading ? <CircularProgress size={16} /> : undefined}
        >
          {loading ? 'Creating...' : 'Create Invite'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
