/**
 * SessionGuestPage (REQ-106)
 *
 * Dedicated page for returning users who join a session with "Use My Preferences".
 * Provides a focused session experience with header, session banner, and preferences.
 */

import { useEffect, useMemo } from 'react';
import { Box, Button, Container, Stack } from '@mui/material';

import { SessionGuestView } from '../components/session/SessionGuestView';
import { useActiveSessions } from '../hooks/useActiveSessions';
import { colors } from '../theme/theme';

/** Extract session ID from URL path /session/:id/preferences */
function getSessionIdFromPath(): string | null {
  const match = window.location.pathname.match(/^\/session\/([^/]+)\/preferences/);
  return match ? match[1] : null;
}

export function SessionGuestPage() {
  const sessionId = getSessionIdFromPath();

  // Redirect to wizard if sessionId is missing (defensive)
  useEffect(() => {
    if (!sessionId) {
      window.location.href = '/';
    }
  }, [sessionId]);

  // Active sessions for banner
  const {
    sessions: activeSessions,
    addSession: handleAddSession,
  } = useActiveSessions();

  // Ensure the session from the URL is tracked as an active session.
  useEffect(() => {
    if (!sessionId) return;
    handleAddSession(sessionId);
  }, [handleAddSession, sessionId]);

  // Get session title from active sessions
  const sessionTitle = useMemo(() => {
    if (!sessionId) return 'Game Night';
    const session = activeSessions.find(s => s.sessionId === sessionId);
    return session?.title || 'Game Night';
  }, [sessionId, activeSessions]);

  // No session ID in URL
  if (!sessionId) {
    return null;
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: colors.warmWhite }}>
      {/* Main Content */}
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Stack spacing={2}>
          <Button
            variant="text"
            onClick={() => (window.location.href = `/session/${sessionId}`)}
            sx={{ alignSelf: 'flex-start' }}
          >
            Back
          </Button>

          <SessionGuestView sessionId={sessionId} sessionTitle={sessionTitle} />
        </Stack>
      </Container>
    </Box>
  );
}
