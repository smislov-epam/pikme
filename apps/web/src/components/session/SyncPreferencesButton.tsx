/**
 * SyncPreferencesButton (REQ-106)
 *
 * Button for hosts/local users to sync their local preferences
 * to Firebase for the active session, so other participants can see them.
 */

import { useState } from 'react';
import { Button, CircularProgress, Tooltip } from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import CheckIcon from '@mui/icons-material/Check';
import { colors } from '../../theme/theme';
import type { UserPreferenceRecord } from '../../db/types';
import type { SharedGamePreference } from '../../services/session/types';
import { useToast } from '../../services/toast';

export interface SyncPreferencesButtonProps {
  /** Session ID to sync to */
  sessionId: string;
  /** Current user preferences */
  preferences: UserPreferenceRecord[];
  /** BGG IDs of games in filtered pool (only sync preferences for these games) */
  filteredGameBggIds: Set<number>;
  /** Compact size for inline display */
  compact?: boolean;
}

/**
 * Converts local preferences to shared format.
 * Only includes preferences for games in the filtered set.
 */
function toSharedPreferences(
  prefs: UserPreferenceRecord[],
  filteredBggIds: Set<number>
): SharedGamePreference[] {
  return prefs
    .filter((p) => filteredBggIds.has(p.bggId))
    .map((p) => ({
      bggId: p.bggId,
      rank: p.rank,
      isTopPick: p.isTopPick,
      isDisliked: p.isDisliked,
    }));
}

export function SyncPreferencesButton({
  sessionId,
  preferences,
  filteredGameBggIds,
  compact = false,
}: SyncPreferencesButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const toast = useToast();

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const { submitGuestPreferences } = await import('../../services/session');
      await submitGuestPreferences(sessionId, toSharedPreferences(preferences, filteredGameBggIds));
      setLastSynced(new Date());
      toast.success('Preferences synced to session');
    } catch (err) {
      console.error('[SyncPreferencesButton] Failed to sync:', err);
      toast.error('Failed to sync preferences');
    } finally {
      setIsSyncing(false);
    }
  };

  const buttonContent = isSyncing ? (
    <CircularProgress size={16} color="inherit" />
  ) : lastSynced ? (
    <CheckIcon sx={{ fontSize: compact ? 16 : 20 }} />
  ) : (
    <SyncIcon sx={{ fontSize: compact ? 16 : 20 }} />
  );

  const tooltipTitle = lastSynced
    ? `Last synced: ${lastSynced.toLocaleTimeString()}`
    : 'Sync your preferences to the session so others can see them';

  if (compact) {
    return (
      <Tooltip title={tooltipTitle}>
        <Button
          size="small"
          onClick={handleSync}
          disabled={isSyncing}
          sx={{
            minWidth: 'auto',
            px: 1,
            color: lastSynced ? colors.oceanBlue : 'text.secondary',
          }}
        >
          {buttonContent}
        </Button>
      </Tooltip>
    );
  }

  return (
    <Tooltip title={tooltipTitle}>
      <Button
        variant="outlined"
        size="small"
        startIcon={buttonContent}
        onClick={handleSync}
        disabled={isSyncing}
        sx={{
          borderColor: lastSynced ? colors.oceanBlue : 'divider',
          color: lastSynced ? colors.oceanBlue : 'text.secondary',
          '&:hover': {
            borderColor: colors.oceanBlue,
            bgcolor: `${colors.oceanBlue}10`,
          },
        }}
      >
        {lastSynced ? 'Synced' : 'Sync Preferences'}
      </Button>
    </Tooltip>
  );
}
