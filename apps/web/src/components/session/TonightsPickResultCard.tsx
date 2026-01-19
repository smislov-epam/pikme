/**
 * TonightsPickResultCard (REQ-106)
 *
 * Compact card showing the Tonight's Pick game selection result.
 * Used in guest waiting view and results display.
 */

import { Box, Card, Stack, Typography, alpha } from '@mui/material';
import TrophyIcon from '@mui/icons-material/EmojiEvents';
import GroupsIcon from '@mui/icons-material/Groups';
import ScheduleIcon from '@mui/icons-material/Schedule';
import type { SessionResultInfo } from '../../services/session/types';
import { colors } from '../../theme/theme';

export interface TonightsPickResultCardProps {
  result: SessionResultInfo;
}

/**
 * Compact Tonight's Pick card for showing the result to guests.
 */
export function TonightsPickResultCard({ result }: TonightsPickResultCardProps) {
  const bgImage = result.image || result.thumbnail || '/vite.svg';

  const playerRange =
    result.minPlayers && result.maxPlayers
      ? result.minPlayers === result.maxPlayers
        ? `${result.minPlayers}`
        : `${result.minPlayers}–${result.maxPlayers}`
      : result.minPlayers
        ? `${result.minPlayers}+`
        : result.maxPlayers
          ? `up to ${result.maxPlayers}`
          : null;

  const playTime = result.playingTimeMinutes
    ? `${result.playingTimeMinutes} min`
    : null;

  return (
    <Card
      sx={{
        width: '100%',
        maxWidth: 400,
        background: 'transparent',
        backgroundColor: 'transparent',
        color: 'white',
        position: 'relative',
        overflow: 'visible',
        borderRadius: 3,
      }}
    >
      {/* Background image + overlay */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          borderRadius: 'inherit',
          zIndex: 0,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url("${bgImage}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: 'saturate(1.05) contrast(1.03)',
          }}
        />

        {/* Blue gradient overlay for readability */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(90deg, ${alpha(colors.oceanBlue, 0.7)} 0%, ${alpha(colors.oceanBlue, 0.85)} 55%, ${alpha(colors.navyBlue, 0.97)} 80%, ${colors.navyBlue} 100%)`,
            backdropFilter: 'blur(2px)',
            mixBlendMode: 'normal',
          }}
        />
      </Box>

      {/* Tonight's Pick badge */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 24,
          zIndex: 2,
          bgcolor: colors.sand,
          color: colors.navyBlue,
          px: 2,
          py: 0.5,
          borderRadius: 2,
          fontWeight: 700,
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          boxShadow: `0 8px 18px ${alpha(colors.navyBlue, 0.22)}`,
          transform: 'translateY(-50%)',
        }}
      >
        <TrophyIcon sx={{ fontSize: 18, color: colors.oceanBlue }} />
        Tonight's Pick
      </Box>

      {/* Content */}
      <Box sx={{ position: 'relative', zIndex: 1, p: 3, pt: 4 }}>
        <Typography
          variant="h5"
          fontWeight={700}
          sx={{
            color: 'white',
            textShadow: `0 2px 4px ${alpha('#000', 0.3)}`,
            mb: 1,
          }}
        >
          {result.name}
        </Typography>

        {/* Game info chips */}
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {playerRange && (
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                bgcolor: alpha('#fff', 0.2),
                color: 'white',
                px: 1.5,
                py: 0.5,
                borderRadius: 2,
                fontSize: '0.85rem',
              }}
            >
              <GroupsIcon sx={{ fontSize: 16 }} />
              {playerRange} players
            </Box>
          )}
          {playTime && (
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                bgcolor: alpha('#fff', 0.2),
                color: 'white',
                px: 1.5,
                py: 0.5,
                borderRadius: 2,
                fontSize: '0.85rem',
              }}
            >
              <ScheduleIcon sx={{ fontSize: 16 }} />
              {playTime}
            </Box>
          )}
          {result.score > 0 && (
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                bgcolor: colors.sand,
                color: colors.navyBlue,
                px: 1.5,
                py: 0.5,
                borderRadius: 2,
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              Score: {result.score}
            </Box>
          )}
        </Stack>
      </Box>
    </Card>
  );
}
