/**
 * ParticipantStatusList (REQ-106)
 *
 * Read-only list showing other participants in a session with their ready status.
 * Used in SessionGuestView to let guests see who else has joined.
 */

import { useEffect, useState } from 'react';
import {
  Box,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  alpha,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import { colors } from '../../theme/theme';

export interface ParticipantStatus {
  uid: string;
  displayName: string;
  role: 'host' | 'guest';
  ready: boolean;
}

export interface ParticipantStatusListProps {
  /** Session ID to poll for participants */
  sessionId: string;
  /** Current user's UID to exclude from list */
  currentUserUid?: string;
  /** Poll interval in ms */
  pollInterval?: number;
}

/**
 * Displays other session participants with their ready status.
 * Polls the session for updates.
 */
export function ParticipantStatusList({
  sessionId,
  currentUserUid,
  pollInterval = 8000,
}: ParticipantStatusListProps) {
  const [participants, setParticipants] = useState<ParticipantStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchParticipants = async () => {
      try {
        // Use getSessionPreview which is available to any authenticated user
        const { getSessionPreview } = await import('../../services/session');
        const preview = await getSessionPreview(sessionId);

        if (!isMounted) return;

        // Extract participant info from preview if available
        // For now, we show basic info - host is always there
        const participantList: ParticipantStatus[] = [];

        // Add host
        if (preview.hostName) {
          participantList.push({
            uid: preview.hostUid || 'host',
            displayName: preview.hostName,
            role: 'host',
            ready: true, // Host is always "ready"
          });
        }

        // Filter out current user
        const filtered = participantList.filter(
          (p) => !currentUserUid || p.uid !== currentUserUid
        );

        setParticipants(filtered);
        setError(null);
      } catch (err) {
        console.warn('[ParticipantStatusList] Failed to fetch:', err);
        if (isMounted) {
          setError('Unable to load participants');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchParticipants();
    const interval = setInterval(fetchParticipants, pollInterval);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [sessionId, currentUserUid, pollInterval]);

  if (loading && participants.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">
          Loading participants...
        </Typography>
      </Box>
    );
  }

  if (error || participants.length === 0) {
    return null; // Don't show anything if no other participants
  }

  return (
    <Box
      sx={{
        bgcolor: alpha(colors.skyBlue, 0.05),
        borderRadius: 2,
        border: `1px solid ${alpha(colors.oceanBlue, 0.1)}`,
        p: 1.5,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <GroupIcon sx={{ fontSize: 18, color: colors.oceanBlue }} />
        <Typography variant="subtitle2" sx={{ color: colors.navyBlue, fontWeight: 600 }}>
          Session Participants
        </Typography>
      </Box>

      <List dense disablePadding>
        {participants.map((participant) => (
          <ListItem key={participant.uid} disableGutters sx={{ py: 0.25 }}>
            <ListItemIcon sx={{ minWidth: 28 }}>
              {participant.ready ? (
                <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
              ) : (
                <HourglassEmptyIcon sx={{ fontSize: 16, color: 'action.active' }} />
              )}
            </ListItemIcon>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PersonIcon sx={{ fontSize: 14, color: 'action.active' }} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {participant.displayName}
                    {participant.role === 'host' && (
                      <Typography
                        component="span"
                        variant="caption"
                        sx={{
                          ml: 0.75,
                          px: 0.75,
                          py: 0.125,
                          borderRadius: 1,
                          bgcolor: colors.oceanBlue,
                          color: 'white',
                          fontWeight: 500,
                        }}
                      >
                        Host
                      </Typography>
                    )}
                  </Typography>
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
