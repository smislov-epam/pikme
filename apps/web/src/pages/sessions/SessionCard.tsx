import {
  Card,
  CardActionArea,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material'
import type { ReactElement } from 'react'
import { useState } from 'react'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import HourglassTopIcon from '@mui/icons-material/HourglassTop'
import CelebrationIcon from '@mui/icons-material/Celebration'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ShareIcon from '@mui/icons-material/Share'
import StopCircleIcon from '@mui/icons-material/StopCircle'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import type { ActiveSessionInfo } from '../../hooks/useActiveSessions'
import { colors } from '../../theme/theme'
import { ConfirmDialog } from '../../components/ConfirmDialog'

type StatusDisplay = {
  label: string
  icon: ReactElement
  color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'
  chipSx?: Record<string, unknown>
}

function getStatusDisplay(session: ActiveSessionInfo): StatusDisplay {
  if (session.status === 'closed') {
    return {
      label: "Tonight's Pick revealed",
      icon: <CelebrationIcon sx={{ fontSize: 16 }} />,
      color: 'success' as const,
    }
  }

  if (session.selectedGame) {
    return {
      label: 'Game Selected',
      icon: <CheckCircleIcon sx={{ fontSize: 16 }} />,
      color: 'success' as const,
    }
  }

  if (session.role === 'host') {
    return {
      label: 'Waiting for guests',
      icon: <HourglassEmptyIcon sx={{ fontSize: 16 }} />,
      color: 'info' as const,
    }
  }

  if (session.callerReady) {
    return {
      label: 'Waiting for Pick',
      icon: <HourglassTopIcon sx={{ fontSize: 16, color: colors.oceanBlue }} />,
      color: 'default' as const,
      chipSx: {
        borderColor: colors.oceanBlue,
        color: colors.oceanBlue,
        '& .MuiChip-icon': { color: colors.oceanBlue },
      },
    }
  }

  return {
    label: 'Setting preferences...',
    icon: <HourglassEmptyIcon sx={{ fontSize: 16 }} />,
    color: 'warning' as const,
  }
}

function formatScheduledTime(isoString: string | null) {
  if (!isoString) return null
  try {
    const date = new Date(isoString)
    return date.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return null
  }
}

export function SessionCard(props: {
  session: ActiveSessionInfo
  onViewSession: (sessionId: string) => void
  onViewInvite: (sessionId: string) => void
  onTerminateSession?: (sessionId: string) => Promise<void>
  onDeleteSession?: (sessionId: string) => Promise<void>
}) {
  const { session, onViewSession, onViewInvite, onTerminateSession, onDeleteSession } = props

  const [showTerminateConfirm, setShowTerminateConfirm] = useState(false)
  const [isTerminating, setIsTerminating] = useState(false)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const statusInfo = getStatusDisplay(session)
  const scheduledTime = formatScheduledTime(session.scheduledFor)

  return (
    <Card
      elevation={1}
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <CardActionArea onClick={() => onViewSession(session.sessionId)}>
        <CardContent>
          <Stack spacing={1}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
                🎲 {session.title}
              </Typography>

              {session.role === 'host' && session.status !== 'closed' && (
                <Tooltip title="View & Share Invite">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation()
                      onViewInvite(session.sessionId)
                    }}
                    sx={{
                      bgcolor: alpha(colors.oceanBlue, 0.1),
                      '&:hover': { bgcolor: alpha(colors.oceanBlue, 0.2) },
                    }}
                  >
                    <ShareIcon fontSize="small" sx={{ color: colors.oceanBlue }} />
                  </IconButton>
                </Tooltip>
              )}

              {session.role === 'host' && session.status !== 'closed' && onTerminateSession && (
                <Tooltip title="Close online session (Terminate)">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowTerminateConfirm(true)
                    }}
                    sx={{
                      bgcolor: alpha('#d32f2f', 0.08),
                      '&:hover': { bgcolor: alpha('#d32f2f', 0.16) },
                    }}
                  >
                    <StopCircleIcon fontSize="small" sx={{ color: '#d32f2f' }} />
                  </IconButton>
                </Tooltip>
              )}

              {session.role === 'host' && onDeleteSession && (
                <Tooltip title="Delete session from Firebase">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowDeleteConfirm(true)
                    }}
                    sx={{
                      bgcolor: alpha('#d32f2f', 0.08),
                      '&:hover': { bgcolor: alpha('#d32f2f', 0.16) },
                    }}
                  >
                    <DeleteForeverIcon fontSize="small" sx={{ color: '#d32f2f' }} />
                  </IconButton>
                </Tooltip>
              )}

              <Chip
                size="small"
                label={session.role === 'host' ? 'Host' : 'Guest'}
                color={session.role === 'host' ? 'primary' : 'default'}
                sx={{ fontWeight: 600 }}
              />
            </Stack>

            <Typography variant="body2" color="text.secondary">
              {session.role === 'host'
                ? 'You are hosting'
                : `Hosted by ${session.hostName ?? 'the session host'}`}
              {scheduledTime && ` • ${scheduledTime}`}
            </Typography>

            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Chip
                size="small"
                icon={statusInfo.icon}
                label={statusInfo.label}
                color={statusInfo.color}
                variant="outlined"
                sx={{ fontWeight: 500, ...(statusInfo.chipSx ?? {}) }}
              />
            </Stack>
          </Stack>
        </CardContent>
      </CardActionArea>

      <ConfirmDialog
        open={showTerminateConfirm}
        title="Close online session?"
        message="This will close the online session for everyone (no more updates). The session remains visible until you delete it. Your local data stays on your device."
        confirmLabel="Close session"
        cancelLabel="Cancel"
        isDestructive
        isLoading={isTerminating}
        onCancel={() => {
          if (isTerminating) return
          setShowTerminateConfirm(false)
        }}
        onConfirm={async () => {
          if (!onTerminateSession) return
          setIsTerminating(true)
          try {
            await onTerminateSession(session.sessionId)
            setShowTerminateConfirm(false)
          } finally {
            setIsTerminating(false)
          }
        }}
      />

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete session permanently?"
        message="This will permanently delete the online session from Firebase (including synced preferences and guest data) for everyone. Local data stays on your device."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDestructive
        isLoading={isDeleting}
        onCancel={() => {
          if (isDeleting) return
          setShowDeleteConfirm(false)
        }}
        onConfirm={async () => {
          if (!onDeleteSession) return
          setIsDeleting(true)
          try {
            await onDeleteSession(session.sessionId)
            setShowDeleteConfirm(false)
          } finally {
            setIsDeleting(false)
          }
        }}
      />
    </Card>
  )
}
