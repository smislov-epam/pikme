/**
 * Sessions Management Page (REQ-106)
 *
 * Shows all active sessions for the user with status and navigation.
 */

import { useCallback, useEffect, useState } from 'react'
import { Box, Container, IconButton, Stack, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { colors } from '../theme/theme'
import { useActiveSessions } from '../hooks/useActiveSessions'
import { useAuth } from '../hooks/useAuth'
import { getWizardActiveSessionId, setWizardActiveSessionId } from '../services/storage/wizardStateStorage'
import { SessionsPageHeader } from './sessions/SessionsPageHeader'
import { SessionsList } from './sessions/SessionsList'
import { closeSession, deleteSession } from '../services/session'

export function SessionsPage() {
  const { sessions, isLoading, refreshSessions, setCurrentSession } = useActiveSessions();
  const { user, firebaseReady } = useAuth();
  
  // State for viewing session invite dialog
  const [viewInviteSessionId, setViewInviteSessionId] = useState<string | null>(null);

  // Refresh sessions on mount
  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  const handleViewSession = useCallback((sessionId: string) => {
    setCurrentSession(sessionId);
    window.location.href = `/session/${sessionId}`;
  }, [setCurrentSession]);

  const handleBack = useCallback(() => {
    window.location.href = '/';
  }, []);

  const handleCreateSession = useCallback(() => {
    // Navigate to wizard step 1 to start new session flow
    // Clear wizard's session context only and signal wizard to reset for new session
    setWizardActiveSessionId(null);
    window.location.href = '/?newSession=true';
  }, []);

  const handleViewInvite = useCallback((sessionId: string) => {
    setViewInviteSessionId(sessionId)
  }, [])

  const handleTerminateSession = useCallback(
    async (sessionId: string) => {
      await closeSession(sessionId)
      await refreshSessions()
    },
    [refreshSessions]
  )

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      await deleteSession(sessionId)

      // If the wizard is currently pointed at this session, clear it.
      if (getWizardActiveSessionId() === sessionId) {
        setWizardActiveSessionId(null)
      }

      await refreshSessions()
    },
    [refreshSessions]
  )

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: colors.warmWhite }}>
      <SessionsPageHeader
        activeSessionCount={sessions.length}
        onOpenSessions={() => {
          // Already on this page
        }}
      />

      {/* Content */}
      <Container maxWidth="sm" sx={{ py: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <IconButton aria-label="Back" onClick={handleBack} sx={{ color: colors.oceanBlue }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" sx={{ fontWeight: 700, flex: 1 }}>
            My Sessions
          </Typography>
        </Stack>

        <SessionsList
          sessions={sessions}
          isLoading={isLoading}
          canCreateSession={Boolean(firebaseReady && user)}
          onCreateSession={handleCreateSession}
          onViewSession={handleViewSession}
          onViewInvite={handleViewInvite}
          onTerminateSession={handleTerminateSession}
          onDeleteSession={handleDeleteSession}
          viewInviteSessionId={viewInviteSessionId}
          onCloseInvite={() => setViewInviteSessionId(null)}
        />
      </Container>
    </Box>
  )
}
