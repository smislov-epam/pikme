import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { colors } from '../../../theme/theme';
import { SessionPreviewCard } from '../SessionPreviewCard';
import { GuestPreferencesView } from '../GuestPreferencesView';
import { GuestWaitingView } from '../GuestWaitingView';
import { GuestModeSelection } from '../GuestModeSelection';
import { LocalWizardRedirect } from '../LocalWizardRedirect';
import { PreferenceSourceSelection } from '../PreferenceSourceSelection';
import type { SessionJoinData } from '../../../hooks/session/useSessionJoinData';
import type { SessionJoinActions } from '../../../hooks/session/useSessionJoinActions';

export type SessionJoinViewProps = SessionJoinData & SessionJoinActions;

export function SessionJoinView({
  state,
  preview,
  displayName,
  error,
  isJoining,
  isSelectingSource,
  selectedSlot,
  showNameInput,
  hasSharedPreferences,
  claimedNamedSlot,
  localOwner,
  sessionId,
  setDisplayName,
  setSelectedSlot,
  handleSomeoneElse,
  handleModeSelect,
  handlePreferenceSourceSelect,
  handleJoin,
}: SessionJoinViewProps) {
  const navigate = useNavigate();
  const effectiveSessionId =
    sessionId ?? localStorage.getItem('guestSessionId');

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: colors.warmWhite,
        pt: 0,
        pb: 8,
      }}
    >
      <Container maxWidth="sm">
        {state === 'loading' && (
          <Stack alignItems="center" spacing={2} py={8}>
            <CircularProgress />
            <Typography>Loading session...</Typography>
          </Stack>
        )}

        {state === 'error' && (
          <Stack spacing={3}>
            <Typography variant="h5" textAlign="center" color="text.secondary">
              Unable to Join Session
            </Typography>
            <Alert severity="error">{error}</Alert>
            <Button variant="outlined" onClick={() => navigate('/')}>
              Go to Home
            </Button>
          </Stack>
        )}

        {state === 'preview' && preview && (
          <SessionPreviewCard
            preview={preview}
            displayName={displayName}
            onDisplayNameChange={setDisplayName}
            onJoin={handleJoin}
            isJoining={isJoining}
            error={error}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
            showNameInput={showNameInput}
            onSomeoneElse={handleSomeoneElse}
          />
        )}

        {state === 'loading-games' && (
          <Stack alignItems="center" spacing={2} py={8}>
            <CircularProgress />
            <Typography>Loading games...</Typography>
          </Stack>
        )}

        {state === 'mode-select' && (
          <GuestModeSelection
            sessionTitle={preview?.title ?? 'Game Night'}
            onSelectMode={handleModeSelect}
            hasClaimedNamedSlot={claimedNamedSlot}
          />
        )}

        {state === 'preference-source' && (
          <PreferenceSourceSelection
            sessionTitle={preview?.title ?? 'Game Night'}
            displayName={claimedNamedSlot ? (localOwner?.displayName ?? displayName) : displayName}
            hasSharedPreferences={hasSharedPreferences}
            onSelectSource={handlePreferenceSourceSelect}
            isSelecting={isSelectingSource}
          />
        )}

        {state === 'preferences' && effectiveSessionId && (
          <GuestPreferencesView sessionId={effectiveSessionId} />
        )}

        {state === 'local-wizard' && effectiveSessionId && (
          <LocalWizardRedirect sessionId={effectiveSessionId} />
        )}

        {state === 'waiting' && effectiveSessionId && (
          <GuestWaitingView sessionId={effectiveSessionId} />
        )}

        {(state === 'preferences' || state === 'local-wizard' || state === 'waiting') &&
          !effectiveSessionId && (
            <Alert severity="error">
              Session information is missing. Please reopen the invite link.
            </Alert>
          )}

      </Container>
    </Box>
  );
}
