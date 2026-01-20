/**
 * GuestWaitingView (REQ-106)
 *
 * Shows waiting state and results notification for guests after submitting preferences.
 * Uses Firestore realtime listener for instant updates when host reveals Tonight's Pick.
 * Falls back to polling if realtime connection fails.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Alert, Box, CircularProgress, Stack, Typography, alpha, useTheme } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CelebrationIcon from '@mui/icons-material/Celebration';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import type { SessionResultInfo } from '../../services/session/types';
import { useSessionRealtimeStatus, type SessionRealtimeState } from '../../hooks/session/useSessionRealtimeStatus';
import { TonightsPickResultCard } from './TonightsPickResultCard';

/** Fallback poll interval in ms (only used if realtime fails) */
const POLL_INTERVAL_MS = 10000;

export interface GuestWaitingViewProps {
  sessionId: string;
  /** Optional realtime state from parent to avoid duplicate listeners */
  realtime?: SessionRealtimeState;
}

type SessionStatus = 'open' | 'closed' | 'expired';

/**
 * View shown to guests after they click "I'm Ready".
 * Uses realtime Firestore listener, with polling fallback if connection fails.
 * If parent provides realtime state, skips creating its own listener.
 */
export function GuestWaitingView({ sessionId, realtime: parentRealtime }: GuestWaitingViewProps) {
  const theme = useTheme();

  // Only create our own listener if parent didn't provide realtime state
  const ownRealtime = useSessionRealtimeStatus({ 
    sessionId,
    enabled: !parentRealtime, // Skip listener if parent provided state
  });
  const realtime = parentRealtime ?? ownRealtime;

  // Fallback: Polling state (only used if realtime fails)
  const [fallbackStatus, setFallbackStatus] = useState<SessionStatus>('open');
  const [fallbackSelectedGame, setFallbackSelectedGame] = useState<SessionResultInfo | undefined>();
  const [fallbackResult, setFallbackResult] = useState<SessionResultInfo | undefined>();
  const [usePollingFallback, setUsePollingFallback] = useState(false);
  const isMountedRef = useRef(true);
  const hasShownResultsRef = useRef(false);

  // Use realtime data if connected, otherwise use fallback
  const sessionStatus = realtime.connected ? realtime.status : fallbackStatus;
  const selectedGame = realtime.connected ? realtime.selectedGame : fallbackSelectedGame;
  const result = realtime.connected ? realtime.result : fallbackResult;

  // Enable polling fallback if realtime fails
  useEffect(() => {
    if (realtime.error && !realtime.connected) {
      setUsePollingFallback(true);
    }
  }, [realtime.error, realtime.connected]);

  // Fallback polling (only when realtime fails)
  const checkSessionStatus = useCallback(async () => {
    if (!isMountedRef.current || hasShownResultsRef.current) return;

    try {
      const { getSessionPreview } = await import('../../services/session');
      const preview = await getSessionPreview(sessionId);

      if (!isMountedRef.current) return;

      setFallbackStatus(preview.status);
      setFallbackSelectedGame(preview.selectedGame);
      setFallbackResult(preview.result);

      if (preview.status === 'closed') {
        hasShownResultsRef.current = true;
      }
    } catch (err) {
      console.warn('[GuestWaitingView] Fallback poll failed:', err);
    }
  }, [sessionId]);

  useEffect(() => {
    isMountedRef.current = true;

    // Only poll if realtime isn't working
    if (!usePollingFallback) return;

    checkSessionStatus();
    const intervalId = setInterval(checkSessionStatus, POLL_INTERVAL_MS);

    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [checkSessionStatus, usePollingFallback]);

  // Results revealed - show Tonight's Pick
  if (sessionStatus === 'closed') {
    return (
      <Stack alignItems="center" spacing={3} py={4}>
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: alpha(theme.palette.success.main, 0.15),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'pulse 2s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': { transform: 'scale(1)' },
              '50%': { transform: 'scale(1.05)' },
            },
          }}
        >
          <CelebrationIcon sx={{ fontSize: 48, color: theme.palette.success.main }} />
        </Box>

        <Typography variant="h5" textAlign="center" fontWeight={600}>
          🎲 Tonight's Pick is Ready!
        </Typography>

        {/* Show the game card if result is available */}
        {result && (
          <TonightsPickResultCard result={result} />
        )}

        {!result && (
          <Typography
            variant="body1"
            color="text.secondary"
            textAlign="center"
            maxWidth={320}
          >
            The host has revealed the game selection. Check with your host to see what game was picked!
          </Typography>
        )}

        <Alert severity="success" sx={{ mt: 2, maxWidth: 400 }}>
          Your preferences have been counted in the final selection.
        </Alert>
      </Stack>
    );
  }

  // Game was selected (without closing the session)
  if (selectedGame) {
    return (
      <Stack alignItems="center" spacing={3} py={4}>
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: alpha(theme.palette.success.main, 0.15),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CheckCircleIcon sx={{ fontSize: 48, color: theme.palette.success.main }} />
        </Box>

        <Typography variant="h5" textAlign="center" fontWeight={600}>
          ✅ Game Selected
        </Typography>

        <TonightsPickResultCard result={selectedGame} />

        <Alert severity="success" sx={{ mt: 2, maxWidth: 420 }}>
          The host picked the game. You can coordinate with the group now.
        </Alert>
      </Stack>
    );
  }

  // Session expired
  if (sessionStatus === 'expired') {
    return (
      <Stack alignItems="center" spacing={3} py={6}>
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            bgcolor: 'warning.light',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <HourglassEmptyIcon sx={{ fontSize: 40, color: 'warning.main' }} />
        </Box>

        <Typography variant="h5" textAlign="center">
          Session Expired
        </Typography>

        <Typography variant="body1" color="text.secondary" textAlign="center">
          This game night session has expired.
        </Typography>
      </Stack>
    );
  }

  // Waiting for host to reveal results
  return (
    <Stack alignItems="center" spacing={3} py={6}>
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          bgcolor: 'success.light',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main' }} />
      </Box>

      <Typography variant="h5" textAlign="center">
        You're Ready!
      </Typography>

      <Typography variant="body1" color="text.secondary" textAlign="center">
        Your choices were sent. Waiting for the host to reveal Tonight's Pick...
      </Typography>

      {/* Show connection status */}
      <Stack direction="row" alignItems="center" spacing={1} mt={2}>
        {realtime.connected ? (
          <Typography variant="caption" color="success.main">
            ● Live updates enabled
          </Typography>
        ) : usePollingFallback ? (
          <>
            <CircularProgress size={16} />
            <Typography variant="caption" color="text.secondary">
              Checking for results...
            </Typography>
          </>
        ) : (
          <>
            <CircularProgress size={16} />
            <Typography variant="caption" color="text.secondary">
              Connecting...
            </Typography>
          </>
        )}
      </Stack>

      <Alert severity="info" sx={{ mt: 2, maxWidth: 400 }}>
        You'll see an update here when the host reveals the game selection. You can also close this
        tab and check back later.
      </Alert>
    </Stack>
  );
}
