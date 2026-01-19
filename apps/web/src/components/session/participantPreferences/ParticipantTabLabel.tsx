/**
 * ParticipantTab - Tab label for a participant
 */

import { Box, Typography } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { colors } from '../../../theme/theme';
import type { ParticipantPreferencesInfo } from '../../../services/session/types';

export interface ParticipantTabLabelProps {
  participant: ParticipantPreferencesInfo;
}

export function ParticipantTabLabel({ participant }: ParticipantTabLabelProps) {
  return (
    <>
      <PersonIcon sx={{ fontSize: 16 }} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 0.5 }}>
        {participant.displayName}
        {participant.role === 'host' && (
          <Typography
            component="span"
            sx={{
              ml: 0.5,
              px: 0.5,
              py: 0.125,
              borderRadius: 0.5,
              bgcolor: colors.oceanBlue,
              color: 'white',
              fontSize: '0.55rem',
              fontWeight: 600,
            }}
          >
            Host
          </Typography>
        )}
        <Typography
          component="span"
          sx={{
            ml: 0.25,
            fontSize: '0.7rem',
            color: 'text.secondary',
          }}
        >
          ({participant.preferences.length})
        </Typography>
      </Box>
    </>
  );
}
