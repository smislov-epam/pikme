/**
 * Users List (REQ-111)
 *
 * Admin component to list registered users and manage their access.
 * Uses shared UI components for consistency and mobile responsiveness.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import PeopleIcon from '@mui/icons-material/People';
import RefreshIcon from '@mui/icons-material/Refresh';
import RestoreIcon from '@mui/icons-material/Restore';
import VerifiedIcon from '@mui/icons-material/Verified';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  listUsers,
  revokeUserAccess,
  restoreUserAccess,
  type RegisteredUser,
} from '../../services/admin';
import { ConfirmDialog } from '../ConfirmDialog';
import { EmptyState } from '../ui/EmptyState';
import { ActionMenu, type ActionItem } from '../ui/ActionMenu';

type FilterStatus = 'all' | 'active' | 'disabled';

export function UsersList() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('all');

  // Revoke confirmation
  const [revokeTarget, setRevokeTarget] = useState<RegisteredUser | null>(null);

  // Restore confirmation
  const [restoreTarget, setRestoreTarget] = useState<RegisteredUser | null>(
    null
  );

  // Track failed action for retry
  const [failedAction, setFailedAction] = useState<{
    type: 'revoke' | 'restore';
    target: RegisteredUser;
  } | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleRevoke = async () => {
    if (!revokeTarget) return;

    setActionLoading(revokeTarget.uid);
    setFailedAction(null);
    try {
      await revokeUserAccess(revokeTarget.uid);
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === revokeTarget.uid ? { ...u, disabled: true } : u
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke access');
      setFailedAction({ type: 'revoke', target: revokeTarget });
    } finally {
      setActionLoading(null);
      setRevokeTarget(null);
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;

    setActionLoading(restoreTarget.uid);
    setFailedAction(null);
    try {
      await restoreUserAccess(restoreTarget.uid);
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === restoreTarget.uid ? { ...u, disabled: false } : u
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore access');
      setFailedAction({ type: 'restore', target: restoreTarget });
    } finally {
      setActionLoading(null);
      setRestoreTarget(null);
    }
  };

  const handleRetry = () => {
    if (!failedAction) return;

    if (failedAction.type === 'revoke') {
      setRevokeTarget(failedAction.target);
    } else {
      setRestoreTarget(failedAction.target);
    }
    setError(null);
    setFailedAction(null);
  };

  const filteredUsers = users.filter((user) => {
    if (filter === 'active') return !user.disabled;
    if (filter === 'disabled') return user.disabled;
    return true;
  });

  const activeCount = users.filter((u) => !u.disabled).length;
  const disabledCount = users.filter((u) => u.disabled).length;

  const getUserStatusChips = (user: RegisteredUser) => {
    const chips = [];

    if (user.disabled) {
      chips.push(
        <Chip
          key="disabled"
          label="Revoked"
          size="small"
          color="error"
          icon={<BlockIcon />}
        />
      );
    }

    if (!user.emailVerified) {
      chips.push(
        <Chip
          key="unverified"
          label="Unverified"
          size="small"
          color="warning"
          icon={<WarningAmberIcon />}
        />
      );
    } else {
      chips.push(
        <Chip
          key="verified"
          label="Verified"
          size="small"
          color="success"
          icon={<VerifiedIcon />}
        />
      );
    }

    return chips;
  };

  const getActions = (user: RegisteredUser): ActionItem[] => {
    if (user.disabled) {
      return [
        {
          key: 'restore',
          label: 'Restore Access',
          icon: <RestoreIcon />,
          onClick: () => setRestoreTarget(user),
          color: 'success',
        },
      ];
    }
    return [
      {
        key: 'revoke',
        label: 'Revoke Access',
        icon: <BlockIcon />,
        onClick: () => setRevokeTarget(user),
        color: 'error',
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
        {isMobile ? (
          <FormControl size="small" fullWidth>
            <InputLabel>Filter</InputLabel>
            <Select
              value={filter}
              label="Filter"
              onChange={(e) => setFilter(e.target.value as FilterStatus)}
            >
              <MenuItem value="all">All ({users.length})</MenuItem>
              <MenuItem value="active">Active ({activeCount})</MenuItem>
              <MenuItem value="disabled">Revoked ({disabledCount})</MenuItem>
            </Select>
          </FormControl>
        ) : (
          <ToggleButtonGroup
            value={filter}
            exclusive
            onChange={(_, value) => value && setFilter(value)}
            size="small"
          >
            <ToggleButton value="all">All ({users.length})</ToggleButton>
            <ToggleButton value="active">Active ({activeCount})</ToggleButton>
            <ToggleButton value="disabled">Revoked ({disabledCount})</ToggleButton>
          </ToggleButtonGroup>
        )}
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

      {filteredUsers.length === 0 ? (
        <EmptyState
          icon={<PeopleIcon sx={{ fontSize: 48 }} />}
          message={filter === 'all' ? 'No registered users' : `No ${filter} users`}
          description={
            filter === 'all'
              ? 'Users who register will appear here'
              : undefined
          }
          action={{
            label: 'Refresh',
            onClick: loadUsers,
            variant: 'outlined',
            icon: <RefreshIcon />,
          }}
        />
      ) : (
        <Paper variant="outlined">
          <List disablePadding>
            {filteredUsers.map((user, index) => (
              <ListItem
                key={user.uid}
                divider={index < filteredUsers.length - 1}
                secondaryAction={
                  <ActionMenu
                    actions={getActions(user)}
                    loading={actionLoading === user.uid}
                    loadingIndicator={<CircularProgress size={24} />}
                  />
                }
              >
                <ListItemText
                  primary={
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        flexWrap: 'wrap',
                      }}
                    >
                      <Typography
                        sx={{
                          textDecoration: user.disabled
                            ? 'line-through'
                            : 'none',
                          color: user.disabled ? 'text.secondary' : 'inherit',
                          wordBreak: 'break-word',
                        }}
                      >
                        {user.email}
                      </Typography>
                      {!isMobile && getUserStatusChips(user)}
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography component="span" variant="body2">
                        {user.displayName}
                      </Typography>
                      {isMobile && (
                        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                          {getUserStatusChips(user)}
                        </Box>
                      )}
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mt: 0.5 }}
                      >
                        {user.createdAt &&
                          `Registered ${new Date(user.createdAt).toLocaleDateString()}`}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Revoke confirmation dialog */}
      <ConfirmDialog
        open={!!revokeTarget}
        title="Revoke Access"
        message={`Revoke access for ${revokeTarget?.email}? They will no longer be able to create sessions.`}
        confirmLabel="Revoke"
        isDestructive
        onConfirm={handleRevoke}
        onCancel={() => setRevokeTarget(null)}
      />

      {/* Restore confirmation dialog */}
      <ConfirmDialog
        open={!!restoreTarget}
        title="Restore Access"
        message={`Restore access for ${restoreTarget?.email}?`}
        confirmLabel="Restore"
        onConfirm={handleRestore}
        onCancel={() => setRestoreTarget(null)}
      />
    </>
  );
}
