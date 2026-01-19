/**
 * SessionSummaryPanel (REQ-106)
 *
 * Read-only collapsible panel showing session filter context for guests.
 * Displays game count, player range, time range from host's configuration.
 */

import { useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Stack,
  Typography,
  alpha,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import GroupIcon from '@mui/icons-material/Group';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FilterListIcon from '@mui/icons-material/FilterList';
import { colors } from '../../theme/theme';

export interface SessionSummaryPanelProps {
  /** Session title/name */
  sessionTitle: string;
  /** Total games in session */
  gameCount: number;
  /** Player count range */
  playerRange: { min: number; max: number } | null;
  /** Play time range in minutes */
  timeRange: { min: number; max: number } | null;
  /** Number of participants */
  participantCount?: number;
  /** Initially expanded */
  defaultExpanded?: boolean;
}

/** Format time range for display */
function formatTimeRange(range: { min: number; max: number }): string {
  if (range.min === range.max) {
    return `${range.min} min`;
  }
  return `${range.min}–${range.max} min`;
}

/** Format player range for display */
function formatPlayerRange(range: { min: number; max: number }): string {
  if (range.min === range.max) {
    return `${range.min} players`;
  }
  return `${range.min}–${range.max} players`;
}

export function SessionSummaryPanel({
  sessionTitle,
  gameCount,
  playerRange,
  timeRange,
  participantCount,
  defaultExpanded = false,
}: SessionSummaryPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, isExpanded) => setExpanded(isExpanded)}
      disableGutters
      elevation={0}
      sx={{
        bgcolor: alpha(colors.skyBlue, 0.08),
        border: `1px solid ${alpha(colors.oceanBlue, 0.15)}`,
        borderRadius: 2,
        '&:before': { display: 'none' },
        '&.Mui-expanded': { margin: 0 },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ color: colors.oceanBlue }} />}
        sx={{
          minHeight: 48,
          '& .MuiAccordionSummary-content': { my: 1 },
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          <FilterListIcon sx={{ color: colors.oceanBlue, fontSize: 20 }} />
          <Typography variant="subtitle2" sx={{ color: colors.navyBlue, fontWeight: 600 }}>
            {sessionTitle}
          </Typography>
          <Chip
            icon={<SportsEsportsIcon sx={{ fontSize: 16 }} />}
            label={`${gameCount} games`}
            size="small"
            sx={{
              bgcolor: colors.sand,
              color: colors.navyBlue,
              fontWeight: 500,
              '& .MuiChip-icon': { color: colors.navyBlue },
            }}
          />
        </Stack>
      </AccordionSummary>

      <AccordionDetails sx={{ pt: 0, pb: 2 }}>
        <Stack spacing={1.5}>
          {/* Filter details */}
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            {playerRange && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <GroupIcon sx={{ fontSize: 18, color: colors.oceanBlue }} />
                <Typography variant="body2" color="text.secondary">
                  {formatPlayerRange(playerRange)}
                </Typography>
              </Box>
            )}
            {timeRange && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <AccessTimeIcon sx={{ fontSize: 18, color: colors.oceanBlue }} />
                <Typography variant="body2" color="text.secondary">
                  {formatTimeRange(timeRange)}
                </Typography>
              </Box>
            )}
            {participantCount !== undefined && participantCount > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <GroupIcon sx={{ fontSize: 18, color: colors.oceanBlue }} />
                <Typography variant="body2" color="text.secondary">
                  {participantCount} participant{participantCount !== 1 ? 's' : ''}
                </Typography>
              </Box>
            )}
          </Stack>

          {/* Informational note */}
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            These games were selected by the host for tonight's session.
            Set your preferences below to influence the final pick!
          </Typography>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
