/**
 * SessionInviteDialog (REQ-108)
 *
 * Lightweight dialog for quickly viewing and sharing a session invite.
 * Fetches session data directly from Firebase - no dependency on wizard state.
 */

import { useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { colors } from '../../theme/theme';
import { getSessionLink, getSessionPreview, type SessionPreview } from '../../services/session';
import { SessionMemberList } from './SessionMemberList';

export interface SessionInviteDialogProps {
  open: boolean;
  sessionId: string | null;
  onClose: () => void;
}

/**
 * Dialog for viewing and sharing an existing session invite.
 */
export function SessionInviteDialog({
  open,
  sessionId,
  onClose,
}: SessionInviteDialogProps) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionPreview | null>(null);

  const requestIdRef = useRef(0);

  const handleClose = () => {
    requestIdRef.current += 1;
    setCopied(false);
    setLoading(false);
    setError(null);
    setSessionData(null);
    onClose();
  };

  const handleEnter = () => {
    setCopied(false);

    if (!sessionId) return;

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    setSessionData(null);

    getSessionPreview(sessionId)
      .then((data) => {
        if (requestIdRef.current !== requestId) return;
        setSessionData(data);
      })
      .catch((err) => {
        if (requestIdRef.current !== requestId) return;
        setError(err instanceof Error ? err.message : 'Failed to load session');
      })
      .finally(() => {
        if (requestIdRef.current !== requestId) return;
        setLoading(false);
      });
  };

  const sessionLink = sessionId ? getSessionLink(sessionId) : '';

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(sessionLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: sessionData?.title || 'Game Night Invite',
          text: `Join my game night! 🎲`,
          url: sessionLink,
        });
      } catch {
        // User cancelled or share failed - just copy to clipboard
        await handleCopyLink();
      }
    } else {
      await handleCopyLink();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      TransitionProps={{ onEnter: handleEnter }}
    >
      <DialogTitle
        sx={{
          bgcolor: colors.oceanBlue,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <ShareIcon />
        Session Invite
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 2 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && sessionData && sessionId && (
          <Stack spacing={3}>
            {/* Session Info */}
            <Box>
              <Typography variant="h6" gutterBottom>
                🎲 {sessionData.title}
              </Typography>
              {sessionData.hostName && sessionData.callerRole !== 'host' && (
                <Typography variant="body2" color="text.secondary">
                  Hosted by {sessionData.hostName}
                </Typography>
              )}
            </Box>

            <Typography variant="body2" color="text.secondary">
              Share this link with your guests to invite them to your game night.
            </Typography>

            {/* Invite Link */}
            <TextField
              value={sessionLink}
              fullWidth
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title={copied ? 'Copied!' : 'Copy link'}>
                      <IconButton onClick={handleCopyLink} edge="end">
                        {copied ? (
                          <CheckCircleIcon color="success" />
                        ) : (
                          <ContentCopyIcon />
                        )}
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />

            <Divider />

            {/* Member Status Section */}
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ mb: 1, color: colors.oceanBlue }}
              >
                Guest Status
              </Typography>
              <SessionMemberList sessionId={sessionId} />
            </Box>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>Close</Button>
        {!loading && !error && sessionId && (
          <Button
            variant="contained"
            startIcon={<ShareIcon />}
            onClick={handleShareNative}
            sx={{
              bgcolor: colors.oceanBlue,
              '&:hover': { bgcolor: colors.navyBlue },
            }}
          >
            Share
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
