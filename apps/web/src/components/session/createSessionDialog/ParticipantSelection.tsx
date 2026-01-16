/**
 * Participant Selection for Session Creation (REQ-103)
 *
 * Allows host to select named participants and optionally include their preferences.
 */

import {
  Box,
  Checkbox,
  FormControlLabel,
  Stack,
  Typography,
} from '@mui/material';
import type { UserRecord, UserPreferenceRecord } from '../../../db/types';

export interface ParticipantSelectionProps {
  /** Non-host users available for selection */
  users: UserRecord[];
  /** Preferences by username */
  preferences: Record<string, UserPreferenceRecord[]>;
  /** Selected participants (username -> include preferences) */
  selected: Record<string, boolean>;
  /** Called when selection changes */
  onSelectionChange: (selected: Record<string, boolean>) => void;
  /** Compact mode for mobile - stacks vertically */
  compact?: boolean;
}

export function ParticipantSelection({
  users,
  preferences,
  selected,
  onSelectionChange,
  compact = false,
}: ParticipantSelectionProps) {
  if (users.length === 0) {
    return null;
  }

  const handleParticipantToggle = (username: string, checked: boolean) => {
    if (checked) {
      // Add participant (initially without prefs)
      onSelectionChange({ ...selected, [username]: false });
    } else {
      // Remove participant
      const next = { ...selected };
      delete next[username];
      onSelectionChange(next);
    }
  };

  const handleIncludePrefsToggle = (username: string, checked: boolean) => {
    onSelectionChange({ ...selected, [username]: checked });
  };

  const isSelected = (username: string) => username in selected;
  const includePrefs = (username: string) => selected[username] === true;
  const prefsCount = (username: string) => (preferences[username] ?? []).length;

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" color="text.secondary">
        Named Participants
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Pre-name slots for known players.
      </Typography>
      
      <Stack spacing={0.5}>
        {users.map((user) => {
          const hasPrefs = prefsCount(user.username) > 0;
          const userSelected = isSelected(user.username);
          
          return (
            <Box key={user.username}>
              <Stack
                direction={compact ? 'column' : 'row'}
                alignItems={compact ? 'flex-start' : 'center'}
                spacing={compact ? 0 : 1}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={userSelected}
                      onChange={(e) => handleParticipantToggle(user.username, e.target.checked)}
                      size="small"
                    />
                  }
                  label={user.displayName || user.username}
                  sx={{ minWidth: compact ? 'auto' : 140 }}
                />
                {userSelected && hasPrefs && (
                  <FormControlLabel
                    sx={{ ml: compact ? 4 : 0 }}
                    control={
                      <Checkbox
                        checked={includePrefs(user.username)}
                        onChange={(e) => handleIncludePrefsToggle(user.username, e.target.checked)}
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2" color="text.secondary">
                        Include preferences ({prefsCount(user.username)})
                      </Typography>
                    }
                  />
                )}
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Stack>
  );
}
