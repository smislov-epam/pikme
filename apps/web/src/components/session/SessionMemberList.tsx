/**
 * SessionMemberList (REQ-103)
 *
 * Displays list of session members with their ready status.
 * Host can see which guests have joined and who is ready.
 */

import { useEffect, useState } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PersonIcon from '@mui/icons-material/Person';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { colors } from '../../theme/theme';
import { getSessionMembers, removeSessionGuest } from '../../services/session';
import type { SessionMemberInfo } from '../../services/session/types';
import { ConfirmDialog } from '../ConfirmDialog';

export interface SessionMemberListProps {
  /** Session ID to fetch members for */
  sessionId: string;
  /** Whether to poll for updates */
  pollInterval?: number;
}

/**
 * Displays session members with their join/ready status.
 */
export function SessionMemberList({
  sessionId,
  pollInterval = 5000,
}: SessionMemberListProps) {
  const [members, setMembers] = useState<SessionMemberInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingUid, setRemovingUid] = useState<string | null>(null);
  const [guestToRemove, setGuestToRemove] = useState<SessionMemberInfo | null>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const result = await getSessionMembers(sessionId);
        setMembers(result);
      } catch (err) {
        console.error('Failed to fetch session members:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();

    // Poll for updates
    const interval = setInterval(fetchMembers, pollInterval);
    return () => clearInterval(interval);
  }, [sessionId, pollInterval]);

  const handleRemoveGuest = async () => {
    if (!guestToRemove || guestToRemove.role !== 'guest') return;

    setRemovingUid(guestToRemove.uid);
    try {
      await removeSessionGuest(sessionId, guestToRemove.uid);
      setMembers((prev) => prev.filter((m) => m.uid !== guestToRemove.uid));
    } catch (err) {
      console.error('Failed to remove guest:', err);
    } finally {
      setRemovingUid(null);
      setGuestToRemove(null);
    }
  };

  if (loading && members.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (members.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No guests have joined yet
      </Typography>
    );
  }

  return (
    <List dense disablePadding>
      {members.map((member) => (
        <ListItem key={member.uid} disableGutters>
          <ListItemIcon sx={{ minWidth: 36 }}>
            {member.ready ? (
              <CheckCircleIcon sx={{ color: 'success.main' }} />
            ) : (
              <HourglassEmptyIcon color="action" />
            )}
          </ListItemIcon>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon fontSize="small" color="action" />
                <Typography
                  variant="body2"
                  sx={{
                    color: member.ready ? 'success.main' : 'text.primary',
                    fontWeight: member.ready ? 600 : 400,
                  }}
                >
                  {member.displayName}
                  {member.role === 'host' && (
                    <Chip
                      label="Host"
                      size="small"
                      sx={{
                        ml: 1,
                        height: 18,
                        fontSize: '0.65rem',
                        bgcolor: colors.oceanBlue,
                        color: 'white',
                      }}
                    />
                  )}
                </Typography>
              </Box>
            }
            secondary={member.ready ? 'Ready' : 'Setting preferences...'}
          />
          {member.role === 'guest' && (
            <IconButton
              edge="end"
              size="small"
              aria-label={`Remove ${member.displayName}`}
              onClick={() => setGuestToRemove(member)}
              disabled={removingUid === member.uid}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          )}
        </ListItem>
      ))}

      {/* Remove guest confirmation dialog */}
      <ConfirmDialog
        open={guestToRemove !== null}
        title="Remove Guest"
        message={`Are you sure you want to remove ${guestToRemove?.displayName ?? 'this guest'} from this session?`}
        confirmLabel="Remove"
        isDestructive
        isLoading={removingUid !== null}
        onConfirm={handleRemoveGuest}
        onCancel={() => setGuestToRemove(null)}
      />
    </List>
  );
}
