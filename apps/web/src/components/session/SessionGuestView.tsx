/**
 * SessionGuestView (REQ-106)
 *
 * Main view for returning users who join a session with "Use My Preferences".
 * Shows session summary, participant status, preferences UI, and I'm Ready flow.
 */

import { Alert, Box, Button, CircularProgress, Stack, Typography, alpha } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';

import { PreferencesStepContent } from '../steps/preferences/PreferencesStepContent';
import { SessionSummaryPanel } from './SessionSummaryPanel';
import { GuestWaitingView } from './GuestWaitingView';
import { OtherParticipantsPreferences } from './OtherParticipantsPreferences';
import { useSessionGuestState } from '../../hooks/session/useSessionGuestState';
import { useSessionRealtimeStatus } from '../../hooks/session/useSessionRealtimeStatus';
import { TonightsPickResultCard } from './TonightsPickResultCard';
import { colors } from '../../theme/theme';

export interface SessionGuestViewProps {
  /** Session ID */
  sessionId: string;
  /** Session title for display */
  sessionTitle?: string;
}

/**
 * Session guest view for returning users with local preferences.
 */
export function SessionGuestView({ sessionId, sessionTitle }: SessionGuestViewProps) {
  const realtime = useSessionRealtimeStatus({ sessionId });
  const {
    localOwner,
    games,
    gameOwners,
    preferences,
    userRatings,
    users,
    sessionFilters,
    layoutMode,
    isLoading,
    isReady,
    hasChanges,
    error,
    setLayoutMode,
    updatePreference,
    reorderPreferences,
    clearPreference,
    markReady,
  } = useSessionGuestState(sessionId);

  // Loading state
  if (isLoading && !localOwner) {
    return (
      <Stack alignItems="center" spacing={2} py={6}>
        <CircularProgress />
        <Typography>Loading your preferences...</Typography>
      </Stack>
    );
  }

  // Ready state without changes - show waiting view that polls for results
  if (isReady && !hasChanges) {
    return <GuestWaitingView sessionId={sessionId} />;
  }

  // No local owner found (edge case)
  if (!localOwner) {
    return (
      <Alert severity="error">
        Unable to load your profile. Please try rejoining the session.
      </Alert>
    );
  }

  const effectiveTitle = sessionTitle || 'Game Night Session';
  const showOtherPicks = realtime.shareMode === 'detailed' && realtime.showOtherParticipantsPicks === true;

  return (
    <Stack spacing={3}>
      {realtime.status === 'open' && realtime.selectedGame && (
        <Stack spacing={1.5}>
          <Alert
            severity="success"
            icon={<CheckCircleIcon sx={{ color: colors.oceanBlue }} />}
            sx={{
              bgcolor: alpha(colors.oceanBlue, 0.06),
              borderColor: alpha(colors.oceanBlue, 0.2),
            }}
          >
            The host selected the game.
          </Alert>
          <TonightsPickResultCard result={realtime.selectedGame} />
        </Stack>
      )}

      {/* Update banner when preferences changed after ready */}
      {isReady && hasChanges && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            p: 1.5,
            borderRadius: 2,
            bgcolor: alpha(colors.oceanBlue, 0.08),
            border: `1px solid ${alpha(colors.oceanBlue, 0.2)}`,
          }}
        >
          <Typography variant="body2" sx={{ color: colors.navyBlue }}>
            You've made changes to your preferences.
          </Typography>
          <Button
            size="small"
            variant="contained"
            startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
            onClick={markReady}
            disabled={isLoading}
            sx={{
              bgcolor: colors.oceanBlue,
              '&:hover': { bgcolor: colors.oceanBlue, filter: 'brightness(0.9)' },
            }}
          >
            Update
          </Button>
        </Box>
      )}

      {/* Session Summary Panel */}
      <SessionSummaryPanel
        sessionTitle={effectiveTitle}
        gameCount={sessionFilters?.gameCount ?? games.length}
        playerRange={sessionFilters?.playerCount ?? null}
        timeRange={sessionFilters?.timeRange ?? null}
        defaultExpanded={false}
      />

      {/* Other Participants' Picks (configurable; detailed share only) */}
      {showOtherPicks && games.length > 0 && (
        <OtherParticipantsPreferences sessionId={sessionId} games={games} />
      )}

      {/* Instructions */}
      <Alert 
        severity="info" 
        icon={<CheckCircleIcon sx={{ color: colors.oceanBlue }} />}
        sx={{ 
          bgcolor: 'transparent',
          border: 'none',
          '& .MuiAlert-message': { color: 'text.secondary' }
        }}
      >
        Set your preferences for the session games below. When you're done, click "I'm Ready" 
        to share your choices with the host.
      </Alert>

      {/* Preferences UI */}
      {games.length > 0 ? (
        <PreferencesStepContent
          users={users}
          games={games}
          gameOwners={gameOwners}
          layoutMode={layoutMode}
          onLayoutModeChange={setLayoutMode}
          preferences={preferences}
          userRatings={userRatings}
          onUpdatePreference={updatePreference}
          onReorderPreferences={reorderPreferences}
          onClearPreference={clearPreference}
        />
      ) : (
        <Alert severity="warning">
          No games found for this session. Please wait for the host to share games, 
          or try rejoining the session.
        </Alert>
      )}

      {/* Error display */}
      {error && <Alert severity="error">{error}</Alert>}

      {/* Ready button */}
      <Button
        variant="contained"
        size="large"
        onClick={markReady}
        disabled={isLoading || games.length === 0}
        sx={{ 
          py: 1.5,
          bgcolor: colors.sand,
          color: colors.navyBlue,
          fontWeight: 600,
          '&:hover': {
            bgcolor: colors.sand,
            filter: 'brightness(0.95)',
          },
        }}
      >
        {isLoading ? (
          <CircularProgress size={24} color="inherit" />
        ) : (
          "I'm Ready"
        )}
      </Button>
    </Stack>
  );
}
