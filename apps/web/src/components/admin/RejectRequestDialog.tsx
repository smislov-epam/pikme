/**
 * Reject Request Dialog (REQ-111)
 *
 * Dialog for rejecting a registration request with a reason.
 * The reason is required and will be included in the rejection email.
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
import DoNotDisturbIcon from '@mui/icons-material/DoNotDisturb';
import { DialogHeader } from '../ui/DialogHeader';

interface RejectRequestDialogProps {
  open: boolean;
  email: string;
  loading?: boolean;
  onReject: (reason: string) => void;
  onCancel: () => void;
}

export function RejectRequestDialog({
  open,
  email,
  loading = false,
  onReject,
  onCancel,
}: RejectRequestDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  const handleClose = () => {
    if (loading) return;
    setReason('');
    setTouched(false);
    onCancel();
  };

  const handleReject = () => {
    if (!reason.trim()) {
      setTouched(true);
      return;
    }
    onReject(reason.trim());
    setReason('');
    setTouched(false);
  };

  const showError = touched && !reason.trim();

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
    >
      <DialogHeader
        icon={<DoNotDisturbIcon />}
        title="Reject Request"
        variant="destructive"
      />
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Reject registration request for <strong>{email}</strong>.
            The user will be notified via email with your reason.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={2}
            maxRows={4}
            label="Rejection Reason"
            placeholder="Please provide a reason for rejection..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => setTouched(true)}
            error={showError}
            helperText={showError ? 'Rejection reason is required' : ' '}
            inputProps={{ maxLength: 500 }}
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
          color="error"
          onClick={handleReject}
          disabled={!reason.trim() || loading}
          startIcon={loading ? <CircularProgress size={16} /> : undefined}
        >
          {loading ? 'Rejecting...' : 'Reject Request'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
