/**
 * ParticipantPanel - Tab panel content for a participant's preferences
 */

import { Box, Stack, Typography } from '@mui/material';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import StarIcon from '@mui/icons-material/Star';
import { colors } from '../../../theme/theme';
import { PreferenceTile } from './PreferenceTile';
import type { ParticipantPreferencesInfo, SharedGamePreference } from '../../../services/session/types';
import type { GameRecord } from '../../../db/types';

export interface ParticipantPanelProps {
  participant: ParticipantPreferencesInfo;
  gameMap: Map<number, GameRecord>;
  visible: boolean;
}

/** Sort preferences: disliked first, then top picks, then by rank */
function sortPreferences(prefs: SharedGamePreference[]): SharedGamePreference[] {
  return [...prefs].sort((a, b) => {
    // Disliked first
    if (a.isDisliked && !b.isDisliked) return -1;
    if (!a.isDisliked && b.isDisliked) return 1;
    // Then top picks
    if (a.isTopPick && !b.isTopPick) return -1;
    if (!a.isTopPick && b.isTopPick) return 1;
    // Then by rank (lower rank = higher priority)
    const rankA = a.rank ?? 999;
    const rankB = b.rank ?? 999;
    return rankA - rankB;
  });
}

export function ParticipantPanel({ participant, gameMap, visible }: ParticipantPanelProps) {
  if (!visible) return null;

  // Filter to only include preferences with known games
  const prefsWithGames = sortPreferences(participant.preferences)
    .filter((p) => gameMap.has(p.bggId));

  const disliked = prefsWithGames.filter((p) => p.isDisliked);
  const topPicks = prefsWithGames.filter((p) => p.isTopPick && !p.isDisliked);
  const ranked = prefsWithGames.filter((p) => !p.isTopPick && !p.isDisliked);

  if (prefsWithGames.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No preferences set yet
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={1.5} sx={{ p: 1.5 }}>
      {/* Disliked section */}
      {disliked.length > 0 && (
        <Box>
          <Typography
            variant="caption"
            sx={{ color: 'error.main', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}
          >
            <ThumbDownIcon sx={{ fontSize: 12 }} /> Disliked ({disliked.length})
          </Typography>
          <Stack spacing={1}>
            {disliked.map((pref) => (
              <PreferenceTile key={pref.bggId} game={gameMap.get(pref.bggId)!} pref={pref} />
            ))}
          </Stack>
        </Box>
      )}

      {/* Top Picks section */}
      {topPicks.length > 0 && (
        <Box>
          <Typography
            variant="caption"
            sx={{ color: colors.sand, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}
          >
            <StarIcon sx={{ fontSize: 12 }} /> Top Picks ({topPicks.length})
          </Typography>
          <Stack spacing={1}>
            {topPicks.map((pref) => (
              <PreferenceTile key={pref.bggId} game={gameMap.get(pref.bggId)!} pref={pref} />
            ))}
          </Stack>
        </Box>
      )}

      {/* Ranked section */}
      {ranked.length > 0 && (
        <Box>
          <Typography
            variant="caption"
            sx={{ color: colors.oceanBlue, fontWeight: 600, mb: 0.75, display: 'block' }}
          >
            Ranked ({ranked.length})
          </Typography>
          <Stack spacing={1}>
            {ranked.map((pref) => (
              <PreferenceTile key={pref.bggId} game={gameMap.get(pref.bggId)!} pref={pref} />
            ))}
          </Stack>
        </Box>
      )}
    </Stack>
  );
}
