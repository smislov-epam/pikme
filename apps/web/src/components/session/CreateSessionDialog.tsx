/**
 * Create Session Dialog (REQ-102)
 *
 * Dialog for hosts to create a new session and share games with guests.
 */

import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import CancelIcon from '@mui/icons-material/Cancel';
import { colors } from '../../theme/theme';
import type { GameRecord, UserRecord, UserPreferenceRecord } from '../../db/types';
import { createSession } from '../../services/session';
import { SessionViewContent } from './SessionViewContent';
import { CreateSessionForm } from './createSessionDialog/CreateSessionForm';
import { toSessionGameData } from './createSessionDialog/toSessionGameData';
import type { NamedParticipantData, SharedGamePreference } from '../../services/session';

export interface CreateSessionDialogProps {
  open: boolean;
  games: GameRecord[];
  playerCount: number;
  minPlayingTime?: number | null;
  maxPlayingTime?: number | null;
  hostDisplayName: string;
  /** All users in the wizard (for preference sharing) */
  users?: UserRecord[];
  /** All preferences by username */
  preferences?: Record<string, UserPreferenceRecord[]>;
  /** Existing session ID (if viewing an existing invite) */
  existingSessionId?: string | null;
  onClose: () => void;
  /** Called when a new session is created */
  onSessionCreated?: (sessionId: string) => void;
  /** Called when a session is cancelled */
  onSessionCancelled?: () => void;
}

type DialogStep = 'form' | 'creating' | 'success' | 'view' | 'error';

export function CreateSessionDialog({
  open,
  games,
  playerCount,
  minPlayingTime,
  maxPlayingTime,
  hostDisplayName,
  users = [],
  preferences = {},
  existingSessionId,
  onClose,
  onSessionCreated,
  onSessionCancelled,
}: CreateSessionDialogProps) {
  // Compute initial step based on whether we have an existing session
  const getInitialStep = (): DialogStep =>
    existingSessionId ? 'view' : 'form';

  const [step, setStep] = useState<DialogStep>(getInitialStep);
  const [shareMode, setShareMode] = useState<'quick' | 'detailed'>('quick');
  const [title, setTitle] = useState('');
  const [scheduledFor, setScheduledFor] = useState(() => {
    // Default to tomorrow at 7 PM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(19, 0, 0, 0);
    return tomorrow;
  });
  const [sessionId, setSessionId] = useState<string | null>(
    existingSessionId ?? null
  );
  const [addTargetNight, setAddTargetNight] = useState(false);
  const [gamesUploaded, setGamesUploaded] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // State for named participants (non-host users that can be pre-named in the session)
  // Key is username, value is whether to include preferences
  const [selectedParticipants, setSelectedParticipants] = useState<Record<string, boolean>>({});

  // Get non-host users (exclude local owner who is the host)
  const nonHostUsers = users.filter((u) => !u.isLocalOwner);

  // When dialog opens with existing session, show view mode
  const effectiveSessionId = sessionId ?? existingSessionId;

  // Reset state when dialog opens/closes or existingSessionId changes
  useEffect(() => {
    if (open && existingSessionId) {
      // Intentional: sync internal state with props on dialog open
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep('view');
      setSessionId(existingSessionId);
    }
  }, [open, existingSessionId]);

  // Build named participants data for session creation
  const buildNamedParticipants = (): NamedParticipantData[] => {
    if (shareMode === 'quick') return [];
    // Get the set of game IDs that are being shared (filtered games)
    const sharedGameIds = new Set(games.map((g) => g.bggId));
    
    return nonHostUsers
      .filter((u) => selectedParticipants[u.username] !== undefined)
      .map((u) => {
        const includePrefs = selectedParticipants[u.username] === true;
        const userPrefs = preferences[u.username] ?? [];
        
        // Convert preferences to SharedGamePreference format
        // Only include preferences for games that are in the filtered games list
        const sharedPrefs: SharedGamePreference[] = includePrefs
          ? userPrefs
              .filter((p) => sharedGameIds.has(p.bggId))
              .map((p) => ({
                bggId: p.bggId,
                rank: p.rank,
                isTopPick: p.isTopPick,
                isDisliked: p.isDisliked,
              }))
          : [];
        
        return {
          displayName: u.displayName || u.username,
          includePreferences: includePrefs,
          preferences: sharedPrefs,
        };
      });
  };

  const handleCreate = async () => {
    setStep('creating');
    setError(null);

    try {
      const effectivePlayerCount = Math.min(playerCount, 12);
      const effectiveScheduledFor = addTargetNight
        ? scheduledFor
        : new Date(Date.now() + 24 * 60 * 60 * 1000);
      const namedParticipants = buildNamedParticipants();
      const result = await createSession({
        title: title.trim() || undefined,
        scheduledFor: effectiveScheduledFor,
        capacity: effectivePlayerCount,
        minPlayers: effectivePlayerCount,
        maxPlayers: effectivePlayerCount,
        minPlayingTimeMinutes: minPlayingTime,
        maxPlayingTimeMinutes: maxPlayingTime,
        hostDisplayName,
        shareMode,
        games: games.map(toSessionGameData),
        namedParticipants,
      });

      setSessionId(result.sessionId);
      setGamesUploaded(result.gamesUploaded);
      setStep('success');
      onSessionCreated?.(result.sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
      setStep('error');
    }
  };

  const handleCancelSession = () => {
    // TODO: In future, call a Cloud Function to cancel the session
    // For now, just clear the local state
    setSessionId(null);
    setStep('form');
    onSessionCancelled?.();
  };

  const handleClose = () => {
    if (step === 'creating') return; // Don't close while creating
    // Don't reset session state when closing if we have an existing session
    if (!existingSessionId) {
      setStep('form');
      setShareMode('quick');
      setTitle('');
      // Reset scheduledFor to tomorrow 7 PM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(19, 0, 0, 0);
      setScheduledFor(tomorrow);
      setAddTargetNight(false);
      setSessionId(null);
      setGamesUploaded(0);
      setError(null);
      setSelectedParticipants({});
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          bgcolor: colors.oceanBlue,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 1,
        }}
      >
        <ShareIcon />
        {step === 'view'
          ? 'Game Night Invite'
          : step === 'success'
            ? 'Session Created!'
            : 'Create Session'}
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 2 }}>
        {step === 'form' && (
          <CreateSessionForm
            shareMode={shareMode}
            onShareModeChange={setShareMode}
            addTargetNight={addTargetNight}
            onAddTargetNightChange={setAddTargetNight}
            title={title}
            onTitleChange={setTitle}
            scheduledFor={scheduledFor}
            onScheduledForChange={setScheduledFor}
            gamesCount={games.length}
            playerCount={playerCount}
            minPlayingTime={minPlayingTime}
            maxPlayingTime={maxPlayingTime}
            users={nonHostUsers}
            preferences={preferences}
            selectedParticipants={selectedParticipants}
            onSelectedParticipantsChange={setSelectedParticipants}
          />
        )}

        {step === 'creating' && (
          <Stack alignItems="center" spacing={2} py={4}>
            <CircularProgress />
            <Typography>Creating session...</Typography>
          </Stack>
        )}

        {step === 'success' && effectiveSessionId && (
          <SessionViewContent
            sessionId={effectiveSessionId}
            successMessage={`Session created successfully!${gamesUploaded > 0 ? ` ${gamesUploaded} games uploaded.` : ''}`}
          />
        )}

        {step === 'view' && effectiveSessionId && (
          <SessionViewContent sessionId={effectiveSessionId} />
        )}

        {step === 'error' && (
          <Stack spacing={2}>
            <Alert severity="error">{error}</Alert>
            <Button onClick={() => setStep('form')} variant="outlined">
              Try Again
            </Button>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {step === 'form' && (
          <>
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              onClick={handleCreate}
              variant="contained"
              disabled={games.length === 0}
            >
              Create Session
            </Button>
          </>
        )}

        {step === 'success' && (
          <Button onClick={handleClose} variant="contained">
            Done
          </Button>
        )}

        {step === 'view' && (
          <>
            <Button
              onClick={handleCancelSession}
              variant="outlined"
              startIcon={<CancelIcon />}
              sx={{
                color: colors.sand,
                borderColor: colors.sand,
                '&:hover': {
                  borderColor: '#D4A72C',
                  backgroundColor: 'rgba(242, 201, 76, 0.08)',
                },
              }}
            >
              Cancel Invite
            </Button>
            <Button onClick={handleClose} variant="contained">
              Done
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
