/**
 * SessionPreviewCard (REQ-103)
 *
 * Displays session preview information for guests.
 * Supports identity claiming for named slots.
 */

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import GroupIcon from '@mui/icons-material/Group';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { colors } from '../../theme/theme';
import type { SessionPreview, NamedSlotInfo } from '../../services/session/types';
import { IdentityClaimCard } from './IdentityClaimCard';

export interface SessionPreviewCardProps {
  preview: SessionPreview;
  displayName: string;
  onDisplayNameChange: (name: string) => void;
  onJoin: (participantId?: string) => void;
  isJoining: boolean;
  error: string | null;
  /** Currently selected named slot for identity claiming */
  selectedSlot: NamedSlotInfo | null;
  /** Called when user selects a named slot */
  onSelectSlot: (slot: NamedSlotInfo | null) => void;
  /** Whether user chose "I'm someone else" */
  showNameInput: boolean;
  /** Called when user confirms "I'm someone else" */
  onSomeoneElse: () => void;
}

/**
 * Format date for display.
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format time for display.
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Session preview card with join form.
 */
export function SessionPreviewCard({
  preview,
  displayName,
  onDisplayNameChange,
  onJoin,
  isJoining,
  error,
  selectedSlot,
  onSelectSlot,
  showNameInput,
  onSomeoneElse,
}: SessionPreviewCardProps) {
  const isNameValid = displayName.trim().length >= 2;
  const hasNamedSlots = preview.namedSlots.length > 0;
  // Show name input if: no named slots, or user chose "I'm someone else"
  const shouldShowNameInput = !hasNamedSlots || showNameInput;

  return (
    <Stack spacing={3}>
      <Typography
        variant="h4"
        textAlign="center"
        sx={{ color: colors.oceanBlue, fontWeight: 600 }}
      >
        {preview.title}
      </Typography>

      {preview.selectedGame && (
        <Alert severity="success" icon={<CheckCircleIcon />}>
          Game selected: <strong>{preview.selectedGame.name}</strong>
        </Alert>
      )}

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            {/* Date & Time */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <CalendarTodayIcon sx={{ color: colors.oceanBlue }} />
              <Box>
                <Typography variant="body1" fontWeight={500}>
                  {formatDate(preview.scheduledFor)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatTime(preview.scheduledFor)}
                </Typography>
              </Box>
            </Box>

            {/* Games */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <SportsEsportsIcon sx={{ color: colors.oceanBlue }} />
              <Typography>
                <strong>{preview.gameCount}</strong> games available
              </Typography>
            </Box>

            {/* Players */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <GroupIcon sx={{ color: colors.sand }} />
              <Typography>
                {preview.minPlayers === preview.maxPlayers
                  ? `${preview.minPlayers} players`
                  : `${preview.minPlayers}-${preview.maxPlayers} players`}
              </Typography>
            </Box>

            {/* Playing Time */}
            {(preview.minPlayingTimeMinutes || preview.maxPlayingTimeMinutes) && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <AccessTimeIcon sx={{ color: colors.skyBlue }} />
                <Typography>
                  {preview.minPlayingTimeMinutes ?? '?'}-
                  {preview.maxPlayingTimeMinutes ?? '?'} minutes
                </Typography>
              </Box>
            )}

            {/* Slots */}
            <Box
              sx={{
                mt: 1,
                p: 1.5,
                bgcolor: 'grey.100',
                borderRadius: 1,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {preview.claimedCount} of {preview.capacity} spots filled
                {preview.availableSlots > 0
                  ? ` • ${preview.availableSlots} available`
                  : ' • Session is full'}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Join Form */}
      {preview.availableSlots > 0 && preview.status === 'open' ? (
        <Stack spacing={2}>
          {/* Identity Claiming */}
          {hasNamedSlots && !showNameInput && (
            <IdentityClaimCard
              namedSlots={preview.namedSlots}
              selectedSlot={selectedSlot}
              onSelectSlot={onSelectSlot}
              onSomeoneElse={onSomeoneElse}
              isJoining={isJoining}
            />
          )}

          {/* Confirm Selected Slot */}
          {selectedSlot && !showNameInput && (
            <Button
              variant="contained"
              size="large"
              onClick={() => onJoin(selectedSlot.participantId)}
              disabled={isJoining}
              sx={{ py: 1.5 }}
            >
              {isJoining ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                `Join as ${selectedSlot.displayName}`
              )}
            </Button>
          )}

          {/* Name Input Form */}
          {shouldShowNameInput && (
            <Card variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">Join this session</Typography>
                  <TextField
                    label="Your Name"
                    value={displayName}
                    onChange={(e) => onDisplayNameChange(e.target.value)}
                    fullWidth
                    helperText="2-30 characters"
                    error={displayName.length > 0 && !isNameValid}
                  />
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => onJoin()}
                    disabled={!isNameValid || isJoining}
                    sx={{ py: 1.5 }}
                  >
                    {isJoining ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      'Join Session'
                    )}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          )}
        </Stack>
      ) : (
        <Alert severity="warning">
          {preview.status !== 'open'
            ? 'This session is no longer accepting participants'
            : 'This session is full'}
        </Alert>
      )}

      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  );
}
