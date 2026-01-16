/**
 * IdentityClaimCard (REQ-103)
 *
 * Shows when a guest sees named slots that match potential identities.
 * Allows "That's me" to claim a specific slot with pre-shared preferences.
 */

import {
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { colors } from '../../theme/theme';
import type { NamedSlotInfo } from '../../services/session/types';

export interface IdentityClaimCardProps {
  /** Unclaimed named slots */
  namedSlots: NamedSlotInfo[];
  /** Currently selected slot (if any) */
  selectedSlot: NamedSlotInfo | null;
  /** Called when user selects "That's me" for a slot */
  onSelectSlot: (slot: NamedSlotInfo | null) => void;
  /** Called when user confirms "I'm someone else" */
  onSomeoneElse: () => void;
  /** Whether join is in progress */
  isJoining: boolean;
}

/**
 * Identity claiming card for named slots.
 */
export function IdentityClaimCard({
  namedSlots,
  selectedSlot,
  onSelectSlot,
  onSomeoneElse,
  isJoining,
}: IdentityClaimCardProps) {
  if (namedSlots.length === 0) {
    return null;
  }

  return (
    <Card variant="outlined" sx={{ borderColor: colors.oceanBlue }}>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ color: colors.oceanBlue }}>
            Are you one of these people?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            The host has reserved spots for the following players.
            Select your name if you see it:
          </Typography>

          <Stack spacing={1}>
            {namedSlots.map((slot) => (
              <Button
                key={slot.participantId}
                variant={selectedSlot?.participantId === slot.participantId
                  ? 'contained'
                  : 'outlined'}
                startIcon={
                  selectedSlot?.participantId === slot.participantId ? (
                    <CheckCircleIcon />
                  ) : (
                    <PersonIcon />
                  )
                }
                onClick={() => onSelectSlot(
                  selectedSlot?.participantId === slot.participantId
                    ? null
                    : slot
                )}
                disabled={isJoining}
                sx={{
                  justifyContent: 'flex-start',
                  py: 1.5,
                  textTransform: 'none',
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{ flex: 1 }}
                >
                  <Typography variant="body1" fontWeight={500}>
                    {slot.displayName}
                  </Typography>
                  {slot.hasSharedPreferences && (
                    <Chip
                      label="Preferences included"
                      size="small"
                      sx={{
                        bgcolor: selectedSlot?.participantId === slot.participantId
                          ? 'rgba(255, 255, 255, 0.9)'
                          : undefined,
                        color: selectedSlot?.participantId === slot.participantId
                          ? 'success.dark'
                          : 'success.main',
                        borderColor: selectedSlot?.participantId === slot.participantId
                          ? 'transparent'
                          : 'success.main',
                      }}
                      variant="outlined"
                    />
                  )}
                </Stack>
              </Button>
            ))}
          </Stack>

          <Button
            variant="text"
            onClick={onSomeoneElse}
            disabled={isJoining}
            sx={{ alignSelf: 'flex-start', mt: 1 }}
          >
            {isJoining ? (
              <CircularProgress size={20} sx={{ mr: 1 }} />
            ) : null}
            I'm someone else
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
