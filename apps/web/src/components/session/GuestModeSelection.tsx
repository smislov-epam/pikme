/**
 * GuestModeSelection (REQ-103)
 *
 * Allows guest to choose between:
 * 1. Simple guest mode - just set preferences for session games
 * 2. Continue with local data - full wizard with restrictions
 */

import {
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import { colors } from '../../theme/theme';

export type GuestMode = 'guest' | 'local';

export interface GuestModeSelectionProps {
  sessionTitle: string;
  onSelectMode: (mode: GuestMode) => void;
  /** Whether user claimed a named slot (vs entered their own name) */
  hasClaimedNamedSlot?: boolean;
}

/**
 * Mode selection for guests joining a session.
 */
export function GuestModeSelection({
  sessionTitle,
  onSelectMode,
  hasClaimedNamedSlot = false,
}: GuestModeSelectionProps) {
  return (
    <Stack spacing={3}>
      <Typography variant="h5" textAlign="center" sx={{ color: colors.oceanBlue }}>
        Welcome to {sessionTitle}
      </Typography>
      
      <Typography variant="body1" color="text.secondary" textAlign="center">
        How would you like to participate?
      </Typography>

      <Stack spacing={2}>
        {/* Guest Mode */}
        <Card
          variant="outlined"
          sx={{
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              borderColor: colors.oceanBlue,
              bgcolor: 'action.hover',
            },
          }}
          onClick={() => onSelectMode('guest')}
        >
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  bgcolor: colors.skyBlue,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PersonIcon sx={{ color: 'white', fontSize: 28 }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6">Join as Guest</Typography>
                <Typography variant="body2" color="text.secondary">
                  View the host's games and set your preferences.
                  Quick and simple.
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Local Data Mode */}
        <Card
          variant="outlined"
          sx={{
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              borderColor: colors.oceanBlue,
              bgcolor: 'action.hover',
            },
          }}
          onClick={() => onSelectMode('local')}
        >
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  bgcolor: colors.sand,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SportsEsportsIcon sx={{ color: 'white', fontSize: 28 }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6">
                  {hasClaimedNamedSlot ? 'Create My Game Collection' : 'Create My First Collection'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {hasClaimedNamedSlot
                    ? 'Set up your profile and add these games to your collection.'
                    : 'Create your profile and start building your game collection.'}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Stack>
  );
}
