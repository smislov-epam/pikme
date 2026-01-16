/**
 * GuestPreferencesView (REQ-103)
 *
 * Shows the preferences UI for a guest who has joined a session.
 * Uses PreferencesStepContent from the main wizard for consistency.
 */

import { useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import { PreferencesStepContent } from '../steps/preferences/PreferencesStepContent';
import { GUEST_USERNAME, useGuestPreferences } from '../../hooks/useGuestPreferences';

export interface GuestPreferencesViewProps {
  sessionId: string;
}

/**
 * Guest preferences view with Ready button.
 */
export function GuestPreferencesView({ sessionId }: GuestPreferencesViewProps) {
  const [isReady, setIsReady] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Ready state
  if (isReady) {
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
          Your choices were sent. You can close this tab.
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Alert severity="info">
        Browse the games below and set your preferences (ranking is optional). When you're done,
        click "I'm Ready" to send your choices.
      </Alert>

      {games.length > 0 ? (
        <PreferencesStepContent
          users={users}
          games={games}
          gameOwners={gameOwners}
          layoutMode="standard"
          onLayoutModeChange={() => {}}
          preferences={preferences}
          userRatings={userRatings}
          onUpdatePreference={updatePreference}
          onReorderPreferences={reorderPreferences}
          onClearPreference={clearPreference}
          forceFullTiles
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
