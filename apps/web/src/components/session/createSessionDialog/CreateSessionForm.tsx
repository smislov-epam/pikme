import { useState } from 'react';
import {
  alpha,
  Box,
  Button,
  Checkbox,
  Collapse,
  IconButton,
  Paper,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PeopleIcon from '@mui/icons-material/People';
import TimerIcon from '@mui/icons-material/Timer';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';

import { parseDateTimeLocalValue, toDateTimeLocalValue } from './dateTimeLocal';
import { ParticipantSelection } from './ParticipantSelection';
import type { UserRecord, UserPreferenceRecord } from '../../../db/types';
import { colors } from '../../../theme/theme';

export interface CreateSessionFormProps {
  shareMode: 'quick' | 'detailed';
  onShareModeChange: (mode: 'quick' | 'detailed') => void;
  showOtherParticipantsPicks: boolean;
  onShowOtherParticipantsPicksChange: (enabled: boolean) => void;
  addTargetNight: boolean;
  onAddTargetNightChange: (enabled: boolean) => void;
  title: string;
  onTitleChange: (title: string) => void;

  scheduledFor: Date;
  onScheduledForChange: (date: Date) => void;

  gamesCount: number;
  playerCount: number;
  minPlayingTime?: number | null;
  maxPlayingTime?: number | null;
  
  /** Non-host users for participant selection */
  users?: UserRecord[];
  /** Preferences by username */
  preferences?: Record<string, UserPreferenceRecord[]>;
  /** Selected participants (username -> include prefs) */
  selectedParticipants?: Record<string, boolean>;
  /** Called when participant selection changes */
  onSelectedParticipantsChange?: (selected: Record<string, boolean>) => void;
}

export function CreateSessionForm(props: CreateSessionFormProps) {
  const {
    shareMode,
    onShareModeChange,
    showOtherParticipantsPicks,
    onShowOtherParticipantsPicksChange,
    addTargetNight,
    onAddTargetNightChange,
    title,
    onTitleChange,
    scheduledFor,
    onScheduledForChange,
    gamesCount,
    playerCount,
    minPlayingTime,
    maxPlayingTime,
    users = [],
    preferences = {},
    selectedParticipants = {},
    onSelectedParticipantsChange,
  } = props;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [showDateInput, setShowDateInput] = useState(addTargetNight);

  const showParticipantSelection = users.length > 0 && onSelectedParticipantsChange;
  const effectivePlayerCount = Math.min(playerCount, 12);
  const isQuickShare = shareMode === 'quick';

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
      {/* Filter info panel - emphasized */}
      <Paper
        elevation={0}
        sx={{
          px: 1,
          py: 0.75,
          bgcolor: alpha(colors.oceanBlue, 0.08),
          border: `1px solid ${alpha(colors.oceanBlue, 0.2)}`,
          borderRadius: 1.5,
        }}
      >
        <Stack direction="row" spacing={0.75} alignItems="flex-start">
          <InfoOutlinedIcon fontSize="small" color="primary" sx={{ mt: 0.25 }} />
          <Box sx={{ flex: 1 }}>
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={{ xs: 0.5, sm: 2 }} 
              flexWrap="wrap" 
              useFlexGap
            >
              <Stack direction="row" spacing={0.5} alignItems="center">
                <SportsEsportsIcon sx={{ fontSize: 16 }} color="primary" />
                <Typography variant="body2">
                  <strong>{gamesCount}</strong> games
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <PeopleIcon sx={{ fontSize: 16 }} color="primary" />
                <Typography variant="body2">
                  <strong>{effectivePlayerCount}</strong> players max
                </Typography>
              </Stack>
              {(minPlayingTime || maxPlayingTime) && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <TimerIcon sx={{ fontSize: 16 }} color="primary" />
                  <Typography variant="body2">
                    {minPlayingTime ?? '?'}–{maxPlayingTime ?? '?'} min
                  </Typography>
                </Stack>
              )}
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Invite expires {addTargetNight ? 'at scheduled time' : 'in 24 hours'}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Add scheduled time - styled as text button */}
      {!showDateInput ? (
        <Button
          size="small"
          startIcon={<ScheduleIcon />}
          onClick={handleAddTimeClick}
          sx={{
            alignSelf: 'flex-start',
            color: colors.oceanBlue,
            bgcolor: 'transparent',
            '&:hover': {
              bgcolor: alpha(colors.oceanBlue, 0.08),
            },
          }}
        >
          Add Scheduled Time
        </Button>
      ) : (
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
              '& input[type="datetime-local"]::-webkit-calendar-picker-indicator': {
                cursor: 'pointer',
                borderRadius: 4,
                padding: 4,
                marginRight: -4,
                filter:
                  'invert(28%) sepia(45%) saturate(759%) hue-rotate(175deg) brightness(92%) contrast(89%)',
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
      )}

      {/* Share mode buttons */}
      <Stack direction="row" spacing={1}>
        <Button
          variant={isQuickShare ? 'contained' : 'outlined'}
          onClick={() => onShareModeChange('quick')}
          size="small"
          sx={{ minWidth: 100 }}
        >
          Quick Share
        </Button>
        <Button
          variant={!isQuickShare ? 'contained' : 'outlined'}
          onClick={() => onShareModeChange('detailed')}
          size="small"
          sx={{ minWidth: 120 }}
        >
          Detailed Share
        </Button>
      </Stack>

      {/* Mode description */}
      <Typography variant="body2" color="text.secondary" sx={{ pl: 0.5 }}>
        {isQuickShare
          ? 'Guests enter a name, set preferences, and tap Ready.'
          : 'Share your collection. Guests can browse and set preferences.'}
      </Typography>

      {/* Session title - only for detailed mode */}
      <Collapse in={!isQuickShare}>
        <TextField
          label="Session Title"
          placeholder="Game Night"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          fullWidth
          size="small"
          helperText="Optional"
        />
      </Collapse>

      {/* Detailed share: optionally allow guests to see other participants' picks */}
      <Collapse in={!isQuickShare}>
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
          sx={{ pl: 0.5 }}
        />
      </Collapse>

      {/* Player count warning */}
      {playerCount > 12 && (
        <Typography variant="caption" color="warning.main" sx={{ pl: 0.5 }}>
          Quick Share caps at 12 participants. Adjust Filters for larger groups.
        </Typography>
      )}

      {/* Participant selection - only for detailed mode */}
      <Collapse in={!isQuickShare && Boolean(showParticipantSelection)}>
        <ParticipantSelection
          users={users}
          preferences={preferences}
          selected={selectedParticipants}
          onSelectionChange={onSelectedParticipantsChange!}
          compact={isMobile}
        />
      </Collapse>
    </Stack>
  );
}
