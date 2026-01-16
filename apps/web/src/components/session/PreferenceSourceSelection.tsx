/**
 * PreferenceSourceSelection (REQ-103)
 *
 * Allows returning users to choose between host-shared preferences
 * and their existing local preferences.
 */

import {
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { colors } from '../../theme/theme';

export type PreferenceSource = 'host' | 'local';

export interface PreferenceSourceSelectionProps {
  sessionTitle: string;
  displayName: string;
  hasSharedPreferences: boolean;
  onSelectSource: (source: PreferenceSource) => void;
  isSelecting?: boolean;
}

export function PreferenceSourceSelection({
  sessionTitle,
  displayName,
  hasSharedPreferences,
  onSelectSource,
  isSelecting = false,
}: PreferenceSourceSelectionProps) {
  return (
    <Stack spacing={3}>
      <Typography variant="h5" textAlign="center" sx={{ color: colors.oceanBlue }}>
        Welcome back, {displayName || 'Player'}
      </Typography>

      <Typography variant="body1" color="text.secondary" textAlign="center">
        How would you like to use your preferences for {sessionTitle}?
      </Typography>

      <Stack spacing={2}>
        <Card
          variant="outlined"
          sx={{
            cursor: isSelecting ? 'default' : 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              borderColor: colors.oceanBlue,
              bgcolor: 'action.hover',
            },
          }}
          onClick={() => !isSelecting && onSelectSource('host')}
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
                  {hasSharedPreferences
                    ? "Use the host's shared preferences for this session."
                    : 'Start fresh and set your preferences for the host’s games.'}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card
          variant="outlined"
          sx={{
            cursor: isSelecting ? 'default' : 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              borderColor: colors.oceanBlue,
              bgcolor: 'action.hover',
            },
          }}
          onClick={() => !isSelecting && onSelectSource('local')}
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
                <FavoriteIcon sx={{ color: 'white', fontSize: 26 }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6">Use My Preferences</Typography>
                <Typography variant="body2" color="text.secondary">
                  Start from your existing local preferences in a simplified view.
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Stack>
  );
}
