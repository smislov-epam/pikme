/**
 * Pending Requests List (REQ-111)
 *
 * Admin component to list and manage pending registration requests.
 * Uses shared UI components for consistency and mobile responsiveness.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Paper,
  Skeleton,
  TextField,
  Typography,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import InboxIcon from '@mui/icons-material/Inbox';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  listInviteRequests,
  approveInviteRequest,
  rejectInviteRequest,
  type InviteRequest,
} from '../../services/admin';
import { ConfirmDialog } from '../ConfirmDialog';
import { RejectRequestDialog } from './RejectRequestDialog';
import { EmptyState } from '../ui/EmptyState';
import { ActionMenu, type ActionItem } from '../ui/ActionMenu';

/**
 * Discriminated union for dialog state - ensures clean state transitions.
 * Only one dialog can be active at a time, preventing React batching issues.
 */
type DialogState =
  | { type: 'none' }
  | { type: 'confirm-approve'; request: InviteRequest; loading: boolean }
  | { type: 'reject'; request: InviteRequest; loading: boolean }
  | { type: 'show-invite'; email: string; inviteLink: string; linkCopied: boolean };

export function PendingRequestsList() {
  const [requests, setRequests] = useState<InviteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Single dialog state - only one dialog can be active at a time
  const [dialogState, setDialogState] = useState<DialogState>({ type: 'none' });

  // Track failed action for retry
  const [failedAction, setFailedAction] = useState<{
    type: 'approve' | 'reject';
    target: InviteRequest;
    reason?: string;
  } | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listInviteRequests('pending');
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleApprove = async () => {
    if (dialogState.type !== 'confirm-approve') return;

    const targetRequest = dialogState.request;
    setDialogState({ type: 'confirm-approve', request: targetRequest, loading: true });
    setFailedAction(null);

    try {
      const result = await approveInviteRequest(targetRequest.requestId);

      // Remove from list
      setRequests((prev) =>
        prev.filter((r) => r.requestId !== targetRequest.requestId)
      );

      // Single atomic state transition to show invite dialog
      setDialogState({
        type: 'show-invite',
        email: result.email || targetRequest.email,
        inviteLink: result.inviteLink || '',
        linkCopied: false,
      });
    } catch (err) {
      console.error('Approval error:', err);
      setError(err instanceof Error ? err.message : 'Failed to approve request');
      setFailedAction({ type: 'approve', target: targetRequest });
      setDialogState({ type: 'none' });
    }
  };

  const handleReject = async (reason: string) => {
    if (dialogState.type !== 'reject') return;

    const targetRequest = dialogState.request;
    setDialogState({ type: 'reject', request: targetRequest, loading: true });
    setFailedAction(null);

    try {
      await rejectInviteRequest(targetRequest.requestId, reason);
      setRequests((prev) =>
        prev.filter((r) => r.requestId !== targetRequest.requestId)
      );
      setDialogState({ type: 'none' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject request');
      setFailedAction({ type: 'reject', target: targetRequest, reason });
      setDialogState({ type: 'none' });
    }
  };

  const handleRetry = () => {
    if (!failedAction) return;

    if (failedAction.type === 'approve') {
      setDialogState({ type: 'confirm-approve', request: failedAction.target, loading: false });
    } else {
      setDialogState({ type: 'reject', request: failedAction.target, loading: false });
    }
    setError(null);
    setFailedAction(null);
  };

  // Check if any action is loading for a specific request
  const isActionLoading = (requestId: string) =>
    (dialogState.type === 'confirm-approve' || dialogState.type === 'reject') &&
    dialogState.request.requestId === requestId &&
    dialogState.loading;

  const getActions = (request: InviteRequest): ActionItem[] => [
    {
      key: 'approve',
      label: 'Approve',
      icon: <CheckIcon />,
      onClick: () => setDialogState({ type: 'confirm-approve', request, loading: false }),
      color: 'success',
    },
    {
      key: 'reject',
      label: 'Reject',
      icon: <CloseIcon />,
      onClick: () => setDialogState({ type: 'reject', request, loading: false }),
      color: 'error',
    },
  ];

  if (loading) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1 }} />
        ))}
      </Paper>
    );
  }

  // Don't early return for error/empty if we have a dialog to show
  const hasActiveDialog = dialogState.type !== 'none';

  if (error && !hasActiveDialog) {
    return (
      <Alert
        severity="error"
        action={
          failedAction ? (
            <Button color="inherit" size="small" onClick={handleRetry}>
              Retry
            </Button>
          ) : (
            <Button color="inherit" size="small" onClick={() => setError(null)}>
              Dismiss
            </Button>
          )
        }
      >
        {error}
      </Alert>
    );
  }

  if (requests.length === 0 && !hasActiveDialog) {
    return (
      <EmptyState
        icon={<InboxIcon sx={{ fontSize: 48 }} />}
        message="No pending requests"
        description="New registration requests will appear here"
        action={{
          label: 'Refresh',
          onClick: loadRequests,
          variant: 'outlined',
          icon: <RefreshIcon />,
        }}
      />
    );
  }

  return (
    <>
      <Paper variant="outlined">
        <List disablePadding>
          {requests.map((request, index) => (
            <ListItem
              key={request.requestId}
              divider={index < requests.length - 1}
              secondaryAction={
                <ActionMenu
                  actions={getActions(request)}
                  loading={isActionLoading(request.requestId)}
                  loadingIndicator={<CircularProgress size={24} />}
                />
              }
            >
              <ListItemText
                primary={request.email}
                secondary={
                  <>
                    <Typography component="span" variant="body2">
                      {request.displayName}
                    </Typography>
                    {request.message && (
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.secondary"
                        sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}
                      >
                        "{request.message}"
                      </Typography>
                    )}
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mt: 0.5 }}
                    >
                      Requested {new Date(request.requestedAt).toLocaleDateString()}
                    </Typography>
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* Approve confirmation dialog */}
      <ConfirmDialog
        open={dialogState.type === 'confirm-approve'}
        title="Approve Request"
        message={`Approve registration request for ${dialogState.type === 'confirm-approve' ? dialogState.request.email : ''}? An invite link will be created for you to share with them.`}
        confirmLabel="Approve"
        isLoading={dialogState.type === 'confirm-approve' && dialogState.loading}
        onConfirm={handleApprove}
        onCancel={() => setDialogState({ type: 'none' })}
      />

      {/* Reject dialog */}
      <RejectRequestDialog
        open={dialogState.type === 'reject'}
        email={dialogState.type === 'reject' ? dialogState.request.email : ''}
        loading={dialogState.type === 'reject' && dialogState.loading}
        onReject={handleReject}
        onCancel={() => setDialogState({ type: 'none' })}
      />

      {/* Invite link success dialog */}
      <Dialog
        open={dialogState.type === 'show-invite'}
        onClose={() => setDialogState({ type: 'none' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Invite Created</DialogTitle>
        <DialogContent>
          {dialogState.type === 'show-invite' && (
            <>
              <Typography sx={{ mb: 2 }}>
                An invite has been created for <strong>{dialogState.email}</strong>.
                Share this link with them to complete registration:
              </Typography>
              {dialogState.inviteLink ? (
                <>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <TextField
                      fullWidth
                      value={dialogState.inviteLink}
                      size="small"
                      slotProps={{
                        input: {
                          readOnly: true,
                          sx: { fontFamily: 'monospace', fontSize: '0.85rem' },
                        },
                      }}
                    />
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={dialogState.linkCopied ? <CheckIcon /> : <ContentCopyIcon />}
                      onClick={async () => {
                        await navigator.clipboard.writeText(dialogState.inviteLink);
                        setDialogState({ ...dialogState, linkCopied: true });
                      }}
                      color={dialogState.linkCopied ? 'success' : 'primary'}
                      sx={{ minWidth: 100 }}
                    >
                      {dialogState.linkCopied ? 'Copied!' : 'Copy'}
                    </Button>
                  </Box>
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    <strong>Important:</strong> Copy this link now! For security reasons, it cannot be retrieved again after closing this dialog.
                  </Alert>
                </>
              ) : (
                <Alert severity="error">
                  Failed to generate invite link. Please try again or create a new invite from the Invites tab.
                </Alert>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                Note: This link can only be used once and expires in 7 days.
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogState({ type: 'none' })}>Done</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
