/**
 * ActiveSessionBanner (REQ-106)
 *
 * Global banner that appears on all pages when user is in active session(s).
 * Provides quick access to active sessions and exit functionality.
 */

import { Box, Chip, IconButton, Stack, Tooltip, Typography, alpha, useMediaQuery, useTheme } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import { colors } from '../../theme/theme';
import type { ActiveSessionInfo } from '../../hooks/useActiveSessions';

export interface ActiveSessionBannerProps {
  /** List of active sessions */
  sessions: ActiveSessionInfo[];
  /** Currently focused session ID */
  currentSessionId: string | null;
  /** Handler when user clicks to navigate to a session */
  onNavigateToSession: (sessionId: string) => void;
  /** Handler when user exits a session */
  onExitSession: (sessionId: string) => void;
}

/**
 * Banner displaying active session(s) at the top of the app.
 * Shows chips on desktop, carousel on mobile.
 */
export function ActiveSessionBanner({
  sessions,
  currentSessionId,
  onNavigateToSession,
  onExitSession,
}: ActiveSessionBannerProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (sessions.length === 0) return null;

  if (isMobile) {
    return (
      <MobileSessionCarousel
        sessions={sessions}
        currentSessionId={currentSessionId}
        onNavigateToSession={onNavigateToSession}
        onExitSession={onExitSession}
      />
    );
  }

  return (
    <DesktopSessionChips
      sessions={sessions}
      currentSessionId={currentSessionId}
      onNavigateToSession={onNavigateToSession}
      onExitSession={onExitSession}
    />
  );
}

/** Desktop: Row of session chips */
function DesktopSessionChips({
  sessions,
  currentSessionId,
  onNavigateToSession,
  onExitSession,
}: ActiveSessionBannerProps) {
  return (
    <Box
      role="banner"
      aria-live="polite"
      sx={{
        bgcolor: alpha(colors.skyBlue, 0.95),
        backdropFilter: 'blur(8px)',
        borderBottom: `1px solid ${alpha(colors.oceanBlue, 0.2)}`,
        boxShadow: `0 2px 8px ${alpha(colors.navyBlue, 0.1)}`,
        py: 0.75,
        px: 2,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ maxWidth: 'lg', mx: 'auto' }}
      >
        <SportsEsportsIcon sx={{ color: colors.oceanBlue, fontSize: 20 }} />
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, color: colors.navyBlue, mr: 1 }}
        >
          Active Sessions:
        </Typography>

        <Stack direction="row" spacing={1} sx={{ flex: 1, flexWrap: 'wrap', gap: 0.5 }}>
          {sessions.slice(0, 3).map((session) => {
            const isCurrent = session.sessionId === currentSessionId;
            return (
              <SessionChip
                key={session.sessionId}
                session={session}
                isCurrent={isCurrent}
                onNavigate={() => onNavigateToSession(session.sessionId)}
                onExit={() => onExitSession(session.sessionId)}
              />
            );
          })}

          {sessions.length > 3 && (
            <Chip
              size="small"
              label={`+${sessions.length - 3} more`}
              sx={{
                bgcolor: alpha(colors.navyBlue, 0.1),
                color: colors.navyBlue,
                fontWeight: 600,
              }}
            />
          )}
        </Stack>
      </Stack>
    </Box>
  );
}

/** Single session chip for desktop */
function SessionChip({
  session,
  isCurrent,
  onNavigate,
  onExit,
}: {
  session: ActiveSessionInfo;
  isCurrent: boolean;
  onNavigate: () => void;
  onExit: () => void;
}) {
  const chipLabel = [
    session.title,
    session.hostName && session.role === 'guest' ? `• ${session.hostName}` : null,
    session.scheduledFor ? `• ${formatTime(session.scheduledFor)}` : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Chip
      size="small"
      label={chipLabel}
      onClick={onNavigate}
      onDelete={onExit}
      deleteIcon={
        <Tooltip title="Exit session">
          <CloseIcon sx={{ fontSize: 16 }} />
        </Tooltip>
      }
      sx={{
        bgcolor: isCurrent ? colors.sand : alpha(colors.sand, 0.7),
        color: colors.navyBlue,
        fontWeight: 600,
        border: isCurrent ? `2px solid ${colors.oceanBlue}` : 'none',
        cursor: 'pointer',
        '&:hover': {
          bgcolor: isCurrent ? colors.sand : colors.sand,
        },
        '& .MuiChip-deleteIcon': {
          color: alpha(colors.navyBlue, 0.6),
          '&:hover': {
            color: colors.navyBlue,
          },
        },
      }}
    />
  );
}

/** Mobile: Swipeable carousel showing one session at a time */
function MobileSessionCarousel({
  sessions,
  currentSessionId,
  onNavigateToSession,
  onExitSession,
}: ActiveSessionBannerProps) {
  // For now, show the first/current session with navigation dots
  // Full swipe support can be added later with a gesture library
  const currentIndex = sessions.findIndex((s) => s.sessionId === currentSessionId);
  const activeIndex = currentIndex >= 0 ? currentIndex : 0;
  const session = sessions[activeIndex];

  if (!session) return null;

  return (
    <Box
      role="region"
      aria-label="Active sessions"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 1050,
        bgcolor: colors.sand,
        borderBottom: `1px solid ${alpha(colors.oceanBlue, 0.2)}`,
        boxShadow: `0 2px 8px ${alpha(colors.navyBlue, 0.1)}`,
        py: 1,
        px: 2,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        onClick={() => onNavigateToSession(session.sessionId)}
        sx={{ cursor: 'pointer' }}
      >
        <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              color: colors.navyBlue,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {session.title}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: alpha(colors.navyBlue, 0.7) }}
          >
            {session.role === 'guest' && session.hostName
              ? `Hosted by ${session.hostName}`
              : 'You are hosting'}
            {session.scheduledFor && ` • ${formatTime(session.scheduledFor)}`}
          </Typography>
        </Stack>

        <IconButton
          size="small"
          aria-label="Exit session"
          onClick={(e) => {
            e.stopPropagation();
            onExitSession(session.sessionId);
          }}
          sx={{ color: alpha(colors.navyBlue, 0.6) }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      {/* Dot indicators for multiple sessions */}
      {sessions.length > 1 && (
        <Stack
          direction="row"
          spacing={0.5}
          justifyContent="center"
          sx={{ mt: 0.75 }}
        >
          {sessions.slice(0, 5).map((s, index) => (
            <Box
              key={s.sessionId}
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor:
                  index === activeIndex
                    ? colors.oceanBlue
                    : alpha(colors.navyBlue, 0.3),
                cursor: 'pointer',
              }}
              onClick={(e) => {
                e.stopPropagation();
                onNavigateToSession(s.sessionId);
              }}
            />
          ))}
          {sessions.length > 5 && (
            <Typography
              variant="caption"
              sx={{ color: alpha(colors.navyBlue, 0.6), fontSize: 10 }}
            >
              {activeIndex + 1}/{sessions.length}
            </Typography>
          )}
        </Stack>
      )}
    </Box>
  );
}

/** Format scheduled time for display */
function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    if (isToday) return timeStr;
    if (isTomorrow) return `Tomorrow ${timeStr}`;
    return date.toLocaleDateString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}
