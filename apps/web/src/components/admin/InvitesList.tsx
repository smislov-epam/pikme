/**
 * Invites List (REQ-111)
 *
 * Admin component to list registration invites, create new invites,
 * copy invite links, and revoke invites.
 * Uses shared UI components for consistency and mobile responsiveness.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Skeleton,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckIcon from '@mui/icons-material/Check';
import {
  listRegistrationInvites,
  createRegistrationInvite,
  revokeRegistrationInvite,
  type RegistrationInvite,
} from '../../services/admin';
import { ConfirmDialog } from '../ConfirmDialog';
import { CreateInviteDialog } from './CreateInviteDialog';
import { EmptyState } from '../ui/EmptyState';
import { ActionMenu, type ActionItem } from '../ui/ActionMenu';

export function InvitesList() {
  const [invites, setInvites] = useState<RegistrationInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Create invite dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Revoke confirmation
  const [revokeTarget, setRevokeTarget] = useState<RegistrationInvite | null>(
    null
  );

  // Track failed action for retry
  const [failedAction, setFailedAction] = useState<{
    type: 'create' | 'revoke';
    email?: string;
    displayName?: string;
    target?: RegistrationInvite;
  } | null>(null);

  const loadInvites = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listRegistrationInvites('active');
      setInvites(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invites');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const handleCreate = async (email: string, displayName: string) => {
    setCreating(true);
    setFailedAction(null);
    try {
      const invite = await createRegistrationInvite(email, displayName);
      setInvites((prev) => [invite, ...prev]);
      setCreateOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invite');
      setFailedAction({ type: 'create', email, displayName });
    } finally {
      setCreating(false);
    }
  };

  const handleCopyLink = async (invite: RegistrationInvite) => {
    if (!invite.token) {
      setError('Cannot copy link - token not available for this invite');
      return;
    }
    const link = `${window.location.origin}/register?token=${invite.token}`;
    await navigator.clipboard.writeText(link);
    setCopiedId(invite.inviteId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;

    setActionLoading(revokeTarget.inviteId);
    setFailedAction(null);
    try {
      await revokeRegistrationInvite(revokeTarget.inviteId);
      setInvites((prev) =>
        prev.filter((i) => i.inviteId !== revokeTarget.inviteId)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke invite');
      setFailedAction({ type: 'revoke', target: revokeTarget });
    } finally {
      setActionLoading(null);
      setRevokeTarget(null);
    }
  };

  const handleRetry = () => {
    if (!failedAction) return;

    if (failedAction.type === 'create' && failedAction.email && failedAction.displayName) {
      setCreateOpen(true);
    } else if (failedAction.type === 'revoke' && failedAction.target) {
      setRevokeTarget(failedAction.target);
    }
    setError(null);
    setFailedAction(null);
  };

  const getStatusChip = (invite: RegistrationInvite) => {
    if (invite.usedAt) {
      return <Chip label="Used" size="small" color="success" />;
    }
    if (new Date(invite.expiresAt) < new Date()) {
      return <Chip label="Expired" size="small" color="default" />;
    }
    return <Chip label="Active" size="small" color="primary" />;
  };

  const getActions = (invite: RegistrationInvite): ActionItem[] => {
    const isCopied = copiedId === invite.inviteId;
    const canCopy = !!invite.token;
    return [
      {
        key: 'copy',
        label: isCopied ? 'Copied!' : canCopy ? 'Copy Link' : 'Link unavailable',
        icon: isCopied ? <CheckIcon /> : <ContentCopyIcon />,
        onClick: () => handleCopyLink(invite),
        color: isCopied ? 'success' : 'inherit',
        disabled: !canCopy,
      },
      {
        key: 'revoke',
        label: 'Revoke',
        icon: <DeleteOutlineIcon />,
        onClick: () => setRevokeTarget(invite),
        color: 'error',
        hidden: !!invite.usedAt || invite.revoked,
      },
    ];
  };

  if (loading) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1 }} />
        ))}
      </Paper>
    );
  }

  return (
    <>
      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
        >
          Create Invite
        </Button>
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
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
      )}

      {invites.length === 0 ? (
        <EmptyState
          icon={<MailOutlineIcon sx={{ fontSize: 48 }} />}
          message="No active invites"
          description="Create an invite to register new users"
          action={{
            label: 'Refresh',
            onClick: loadInvites,
            variant: 'outlined',
            icon: <RefreshIcon />,
          }}
        />
      ) : (
        <Paper variant="outlined">
          <List disablePadding>
            {invites.map((invite, index) => (
              <ListItem
                key={invite.inviteId}
                divider={index < invites.length - 1}
                secondaryAction={
                  <ActionMenu
                    actions={getActions(invite)}
                    loading={actionLoading === invite.inviteId}
                    loadingIndicator={<CircularProgress size={24} />}
                  />
                }
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography>
                        {invite.email || invite.displayName || 'General invite'}
                      </Typography>
                      {getStatusChip(invite)}
                    </Box>
                  }
                  secondary={
                    <>
                      {invite.displayName && invite.email && (
                        <Typography component="span" variant="body2">
                          {invite.displayName}
                        </Typography>
                      )}
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mt: 0.5 }}
                      >
                        Created {new Date(invite.createdAt).toLocaleDateString()}
                        {' • '}
                        Expires {new Date(invite.expiresAt).toLocaleDateString()}
                        {invite.uses > 0 && ` • Used ${invite.uses}/${invite.maxUses}`}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Create invite dialog */}
      <CreateInviteDialog
        open={createOpen}
        loading={creating}
        onCreate={handleCreate}
        onCancel={() => setCreateOpen(false)}
      />

      {/* Revoke confirmation dialog */}
      <ConfirmDialog
        open={!!revokeTarget}
        title="Revoke Invite"
        message={`Revoke invite for ${revokeTarget?.email}? They will no longer be able to register with this link.`}
        confirmLabel="Revoke"
        isDestructive
        onConfirm={handleRevoke}
        onCancel={() => setRevokeTarget(null)}
      />
    </>
  );
}
