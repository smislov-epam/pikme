/**
 * GuestPreferencesView (REQ-103, REQ-106)
 *
 * Shows the preferences UI for a guest who has joined a session.
 * Uses PreferencesStepContent from the main wizard for consistency.
 * After marking ready, shows GuestWaitingView which polls for results.
 */

import { useState } from 'react';
import { Alert, Button, CircularProgress, Stack, ToggleButton, ToggleButtonGroup, Typography, useMediaQuery, useTheme } from '@mui/material';
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda';
import ViewStreamIcon from '@mui/icons-material/ViewStream';
import type { LayoutMode } from '../../services/storage/uiPreferences';

import { PreferencesStepContent } from '../steps/preferences/PreferencesStepContent';
import { GUEST_USERNAME, useGuestPreferences } from '../../hooks/useGuestPreferences';
import { GuestWaitingView } from './GuestWaitingView';
import { OtherParticipantsPreferences } from './OtherParticipantsPreferences';
import { useSessionRealtimeStatus } from '../../hooks/session/useSessionRealtimeStatus';

/** localStorage key for persisting guest ready state */
const GUEST_READY_KEY = 'guestIsReady';

/** Check if guest is already marked as ready for this session */
function getGuestReadyState(sessionId: string): boolean {
  try {
    const stored = localStorage.getItem(GUEST_READY_KEY);
    if (!stored) return false;
    const data = JSON.parse(stored) as { sessionId: string; ready: boolean };
    return data.sessionId === sessionId && data.ready === true;
  } catch {
    return false;
  }
}

/** Save guest ready state to localStorage */
function setGuestReadyState(sessionId: string, ready: boolean): void {
  localStorage.setItem(GUEST_READY_KEY, JSON.stringify({ sessionId, ready }));
}

export interface GuestPreferencesViewProps {
  sessionId: string;
}

/**
 * Guest preferences view with Ready button.
 */
export function GuestPreferencesView({ sessionId }: GuestPreferencesViewProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const realtime = useSessionRealtimeStatus({ sessionId });
  const showOtherPicks = realtime.shareMode === 'detailed' && realtime.showOtherParticipantsPicks === true;

  // Initialize ready state from localStorage (persists across page refreshes)
  const [isReady, setIsReady] = useState(() => getGuestReadyState(sessionId));
  const [isMarking, setIsMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Layout mode: simplified by default on mobile for guests
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => (isMobile ? 'simplified' : 'standard'));

  const {
    games,
    gameOwners,
    preferences,
    userRatings,
    users,
    isLoading,
    updatePreference,
    reorderPreferences,
    clearPreference,
  } = useGuestPreferences();

  // Ready handler
  const handleReady = async () => {
    setIsMarking(true);
    setError(null);

    try {
      const { submitGuestPreferences, setGuestReady } = await import('../../services/session');
      const currentPrefs = preferences[GUEST_USERNAME] ?? [];
      await submitGuestPreferences(
        sessionId,
        currentPrefs.map((p) => ({
          bggId: p.bggId,
          rank: p.rank ?? null,
          isTopPick: p.isTopPick ?? false,
          isDisliked: p.isDisliked ?? false,
        }))
      );
      await setGuestReady(sessionId);
      sessionStorage.removeItem('guestInitialPreferences');
      
      // Persist ready state for this session
      setGuestReadyState(sessionId, true);
      setIsReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as ready');
      setIsMarking(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Stack alignItems="center" spacing={2} py={6}>
        <CircularProgress />
        <Typography>Loading preferences...</Typography>
      </Stack>
    );
  }

  // Ready state - show waiting view that polls for results
  if (isReady) {
    return <GuestWaitingView sessionId={sessionId} realtime={realtime} />;
  }

  return (
    <Stack spacing={3}>
      <Alert severity="info">
        Browse the games below and set your preferences (ranking is optional). When you're done,
        click "I'm Ready" to send your choices.
      </Alert>

      {/* Layout toggle - desktop only with text labels for clarity */}
      {!isMobile && (
        <ToggleButtonGroup
          value={layoutMode}
          exclusive
          onChange={(_, value) => value && setLayoutMode(value as LayoutMode)}
          size="small"
          sx={{ alignSelf: 'flex-end' }}
        >
          <ToggleButton value="standard" sx={{ textTransform: 'none', px: 2 }}>
            <ViewAgendaIcon fontSize="small" sx={{ mr: 1 }} />
            Card View
          </ToggleButton>
          <ToggleButton value="simplified" sx={{ textTransform: 'none', px: 2 }}>
            <ViewStreamIcon fontSize="small" sx={{ mr: 1 }} />
            Compact View
          </ToggleButton>
        </ToggleButtonGroup>
      )}

      {/* Other Participants' Picks (detailed share only, host-controlled) */}
      {showOtherPicks && games.length > 0 && (
        <OtherParticipantsPreferences sessionId={sessionId} games={games} />
      )}

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
          hideLayoutToggle
        />
      ) : (
        <Alert severity="warning">
          No games found for this session. Please wait for the host to share games.
        </Alert>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      <Button
        variant="contained"
        size="large"
        onClick={handleReady}
        disabled={isMarking}
        sx={{ py: 1.5 }}
      >
        {isMarking ? (
          <CircularProgress size={24} color="inherit" />
        ) : (
          "I'm Ready"
        )}
      </Button>
    </Stack>
  );
}
