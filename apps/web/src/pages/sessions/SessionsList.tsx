import {
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
  alpha,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import type { ActiveSessionInfo } from '../../hooks/useActiveSessions'
import { colors } from '../../theme/theme'
import { SessionInviteDialog } from '../../components/session/SessionInviteDialog'
import { SessionCard } from './SessionCard'
import { SessionCardSkeleton } from './SessionCardSkeleton'

export function SessionsList(props: {
  sessions: ActiveSessionInfo[]
  isLoading: boolean
  canCreateSession: boolean
  onCreateSession: () => void
  onViewSession: (sessionId: string) => void
  onViewInvite: (sessionId: string) => void
  onTerminateSession?: (sessionId: string) => Promise<void>
  onDeleteSession?: (sessionId: string) => Promise<void>
  viewInviteSessionId: string | null
  onCloseInvite: () => void
}) {
  const {
    sessions,
    isLoading,
    canCreateSession,
    onCreateSession,
    onViewSession,
    onViewInvite,
    onTerminateSession,
    onDeleteSession,
    viewInviteSessionId,
    onCloseInvite,
  } = props

  return (
    <Stack spacing={2}>
      {isLoading && sessions.length === 0 && (
        <>
          <SessionCardSkeleton />
          <SessionCardSkeleton />
        </>
      )}

      {sessions.map((session) => {
        return (
          <SessionCard
            key={session.sessionId}
            session={session}
            onViewSession={onViewSession}
            onViewInvite={onViewInvite}
            onTerminateSession={onTerminateSession}
            onDeleteSession={onDeleteSession}
          />
        )
      })}

      {!isLoading && sessions.length === 0 && (
        <Card
          elevation={0}
          sx={{
            borderRadius: 2,
            border: '2px dashed',
            borderColor: 'divider',
            bgcolor: alpha(colors.sand, 0.1),
          }}
        >
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" gutterBottom>
              No active sessions
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Join a session via invite link or create one to get started.
            </Typography>
            {canCreateSession && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={onCreateSession}
                sx={{
                  bgcolor: colors.sand,
                  color: colors.navyBlue,
                  '&:hover': { bgcolor: alpha(colors.sand, 0.85) },
                }}
              >
                Create New Session
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {!isLoading && sessions.length > 0 && canCreateSession && (
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={onCreateSession}
          fullWidth
          sx={{
            borderColor: colors.sand,
            color: colors.navyBlue,
            '&:hover': {
              borderColor: colors.sand,
              bgcolor: alpha(colors.sand, 0.1),
            },
          }}
        >
          Create New Session
        </Button>
      )}

      <SessionInviteDialog
        open={viewInviteSessionId !== null}
        sessionId={viewInviteSessionId}
        onClose={onCloseInvite}
      />
    </Stack>
  )
}
