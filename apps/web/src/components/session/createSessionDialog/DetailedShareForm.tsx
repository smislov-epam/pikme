import { useState } from 'react';
import {
  Checkbox,
  Collapse,
  FormControlLabel,
  IconButton,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ScheduleIcon from '@mui/icons-material/Schedule';

import { parseDateTimeLocalValue, toDateTimeLocalValue } from './dateTimeLocal';
import { ParticipantSelection } from './ParticipantSelection';
import type { UserRecord, UserPreferenceRecord } from '../../../db/types';
import { colors } from '../../../theme/theme';

export interface DetailedShareFormProps {
  showOtherParticipantsPicks: boolean;
  onShowOtherParticipantsPicksChange: (enabled: boolean) => void;
  addTargetNight: boolean;
  onAddTargetNightChange: (enabled: boolean) => void;
  title: string;
  onTitleChange: (title: string) => void;
  scheduledFor: Date;
  onScheduledForChange: (date: Date) => void;
  /** Non-host users for participant selection */
  users?: UserRecord[];
  /** Preferences by username */
  preferences?: Record<string, UserPreferenceRecord[]>;
  /** Selected participants (username -> include prefs) */
  selectedParticipants?: Record<string, boolean>;
  /** Called when participant selection changes */
  onSelectedParticipantsChange?: (selected: Record<string, boolean>) => void;
}

export function DetailedShareForm(props: DetailedShareFormProps) {
  const {
    showOtherParticipantsPicks,
    onShowOtherParticipantsPicksChange,
    addTargetNight,
    onAddTargetNightChange,
    title,
    onTitleChange,
    scheduledFor,
    onScheduledForChange,
    users = [],
    preferences = {},
    selectedParticipants = {},
    onSelectedParticipantsChange,
  } = props;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [showDateInput, setShowDateInput] = useState(addTargetNight);

  const showParticipantSelection = users.length > 0 && onSelectedParticipantsChange;

  const handleAddTimeClick = () => {
    setShowDateInput(true);
    onAddTargetNightChange(true);
  };

  const handleRemoveTime = () => {
    setShowDateInput(false);
    onAddTargetNightChange(false);
  };

  return (
    <Stack spacing={1.5}>
      {/* Session title */}
      <TextField
        label="Session Title"
        placeholder="Game Night"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        fullWidth
        size="small"
        helperText="Optional"
      />

      {/* Add scheduled time */}
      <Collapse in={!showDateInput}>
        <Typography
          variant="body2"
          onClick={handleAddTimeClick}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            color: colors.oceanBlue,
            cursor: 'pointer',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          <ScheduleIcon fontSize="small" />
          Add Scheduled Time
        </Typography>
      </Collapse>

      <Collapse in={showDateInput}>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <TextField
            label="Date & Time"
            type="datetime-local"
            value={toDateTimeLocalValue(scheduledFor)}
            onChange={(e) => onScheduledForChange(parseDateTimeLocalValue(e.target.value))}
            fullWidth
            size="small"
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { step: 60 },
            }}
            sx={{
              '& input[type="datetime-local"]': {
                colorScheme: 'light',
              },
            }}
          />
          <IconButton
            size="small"
            onClick={handleRemoveTime}
            aria-label="Remove scheduled time"
            sx={{ mt: 0.5 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Collapse>

      {/* Show other participants' picks */}
      <FormControlLabel
        control={
          <Checkbox
            checked={showOtherParticipantsPicks}
            onChange={(e) => onShowOtherParticipantsPicksChange(e.target.checked)}
            size="small"
          />
        }
        label={
          <Typography variant="body2">
            Show Other Participants' Picks to guests
          </Typography>
        }
      />

      {/* Participant selection */}
      {showParticipantSelection && (
        <ParticipantSelection
          users={users}
          preferences={preferences}
          selected={selectedParticipants}
          onSelectionChange={onSelectedParticipantsChange!}
          compact={isMobile}
        />
      )}
    </Stack>
  );
}
