/**
 * SessionViewContent (REQ-102, REQ-103)
 *
 * Content for viewing existing session (link sharing and member status).
 */

import { useState } from 'react';
import {
  Alert,
  Box,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { colors } from '../../theme/theme';
import { getSessionLink } from '../../services/session';
import { SessionMemberList } from './SessionMemberList';

export interface SessionViewContentProps {
  sessionId: string;
  /** Optional success message (for newly created sessions) */
  successMessage?: string;
}

/**
 * Session view content with link sharing and member status.
 */
export function SessionViewContent({
  sessionId,
  successMessage,
}: SessionViewContentProps) {
  const [copied, setCopied] = useState(false);
  const sessionLink = getSessionLink(sessionId);

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(sessionLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Stack spacing={3}>
      {successMessage && (
        <Alert severity="success" icon={<CheckCircleIcon />}>
          {successMessage}
        </Alert>
      )}

      <Typography variant="body2" color="text.secondary">
        Share this link with your guests to invite them to your game night.
      </Typography>

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

      <Alert severity="info">
        Guests can use this link to join and set their preferences.
      </Alert>
    </Stack>
  );
}
