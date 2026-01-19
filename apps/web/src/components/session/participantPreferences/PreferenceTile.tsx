/**
 * PreferenceTile - Displays a single game preference using GameTile
 */

import { Typography, alpha } from '@mui/material';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import StarIcon from '@mui/icons-material/Star';
import { colors } from '../../../theme/theme';
import { GameTile, type GameTileVariant } from '../../steps/GameTile';
import type { SharedGamePreference } from '../../../services/session/types';
import type { GameRecord } from '../../../db/types';

export interface PreferenceTileProps {
  game: GameRecord;
  pref: SharedGamePreference;
}

export function PreferenceTile({ game, pref }: PreferenceTileProps) {
  const isDisliked = pref.isDisliked;
  const isTopPick = pref.isTopPick;

  // Determine variant for GameTile
  const variant: GameTileVariant = isDisliked ? 'disliked' : isTopPick ? 'topPick' : 'default';

  // Leading icon for top pick or disliked
  const leading = isDisliked ? (
    <ThumbDownIcon sx={{ fontSize: 16, color: 'error.main' }} />
  ) : isTopPick ? (
    <StarIcon sx={{ fontSize: 16, color: colors.sand }} />
  ) : null;

  // Trailing rank indicator for ranked (non-top-pick, non-disliked)
  const trailing = pref.rank && !isTopPick && !isDisliked ? (
    <Typography
      variant="caption"
      sx={{
        fontWeight: 600,
        color: colors.oceanBlue,
        bgcolor: alpha(colors.oceanBlue, 0.1),
        px: 0.75,
        py: 0.25,
        borderRadius: 0.5,
      }}
    >
      #{pref.rank}
    </Typography>
  ) : null;

  return (
    <GameTile
      game={game}
      variant={variant}
      leading={leading}
      trailing={trailing}
    />
  );
}
