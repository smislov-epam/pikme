/**
 * ConfirmDialog (UI/UX Guidelines)
 *
 * A reusable confirmation dialog that replaces browser's native confirm().
 * Used for destructive or important actions requiring user confirmation.
 *
 * Follows ui-ux-guidelines.md section 9 (Dialog and form guidelines):
 * - Clean, scannable structure
 * - Colored header with icon
 * - Standard button placement at bottom right
 * - Destructive actions use error color
 */

import {
  alpha,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { colors } from '../theme/theme';

export interface ConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Dialog title */
  title: string;
  /** Message/description shown in the dialog body */
  message: string;
  /** Label for the confirm button (default: "Confirm") */
  confirmLabel?: string;
  /** Label for the cancel button (default: "Cancel") */
  cancelLabel?: string;
  /** Whether the action is destructive (uses red styling) */
  isDestructive?: boolean;
  /** Whether the confirm action is in progress */
  isLoading?: boolean;
  /** Called when user confirms */
  onConfirm: () => void;
  /** Called when user cancels or closes the dialog */
  onCancel: () => void;
}

/**
 * A styled confirmation dialog following ui-ux-guidelines.md.
 *
 * @example
 * ```tsx
 * <ConfirmDialog
 *   open={showConfirm}
 *   title="Remove Guest"
 *   message="Are you sure you want to remove John from this session?"
 *   confirmLabel="Remove"
 *   isDestructive
 *   onConfirm={handleRemove}
 *   onCancel={() => setShowConfirm(false)}
 * />
 * ```
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Use a *milder* destructive header (tinted red) to match the app's delete icon styling.
  const destructiveColor = '#d32f2f';
  const headerBgColor = isDestructive
    ? alpha(destructiveColor, 0.12)
    : colors.oceanBlue;
  const headerTextColor = isDestructive ? destructiveColor : 'white';
  const confirmButtonColor = isDestructive ? 'error' : 'primary';

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="xs"
      fullWidth
      aria-labelledby="confirm-dialog-title"
    >
      <DialogTitle
        id="confirm-dialog-title"
        sx={{
          bgcolor: headerBgColor,
          color: headerTextColor,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          py: 1.5,
        }}
      >
        <WarningAmberIcon sx={{ color: headerTextColor }} />
        {title}
      </DialogTitle>
      <DialogContent sx={{ pt: 3, pb: 2 }}>
        <Typography variant="body1">{message}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} disabled={isLoading}>
          {cancelLabel}
        </Button>
        <Button
          variant="contained"
          color={confirmButtonColor}
          onClick={onConfirm}
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
