/**
 * OtherParticipantsPreferences (REQ-106)
 *
 * Read-only display of other participants' preferences in a folder-tab style.
 * Shows games grouped by: disliked (red), top picks (yellow), then ranked.
 * Blue folder tabs with blue outline, expandable per participant.
 */

import { useEffect, useState } from 'react';
import {
  Box,
  CircularProgress,
  Tab,
  Tabs,
  Typography,
  alpha,
} from '@mui/material';
import { colors } from '../../theme/theme';
import { ParticipantPanel, ParticipantTabLabel } from './participantPreferences';
import type { ParticipantPreferencesInfo } from '../../services/session/types';
import type { GameRecord } from '../../db/types';

export interface OtherParticipantsPreferencesProps {
  /** Session ID to fetch participant preferences */
  sessionId: string;
  /** Games in the session (for looking up names) */
  games: GameRecord[];
  /** Poll interval in ms */
  pollInterval?: number;
}

export function OtherParticipantsPreferences({
  sessionId,
  games,
  pollInterval = 10000,
}: OtherParticipantsPreferencesProps) {
  const [participants, setParticipants] = useState<ParticipantPreferencesInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  // Create a game lookup map
  const gameMap = new Map(games.map((g) => [g.bggId, g]));

  useEffect(() => {
    let isMounted = true;

    const fetchParticipants = async () => {
      try {
        const { getReadyParticipantPreferences } = await import('../../services/session');
        const result = await getReadyParticipantPreferences(sessionId);

        if (!isMounted) return;

        setParticipants(result);
        setError(null);
      } catch (err) {
        console.warn('[OtherParticipantsPreferences] Failed to fetch:', err);
        if (isMounted) {
          setError('Unable to load participant preferences');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchParticipants();
    const interval = setInterval(fetchParticipants, pollInterval);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [sessionId, pollInterval]);

  // Reset active tab if it's out of bounds
  useEffect(() => {
    if (activeTab >= participants.length && participants.length > 0) {
      setActiveTab(0);
    }
  }, [participants.length, activeTab]);

  if (loading && participants.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">
          Loading other participants...
        </Typography>
      </Box>
    );
  }

  if (error || participants.length === 0) {
    return (
      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          bgcolor: alpha(colors.skyBlue, 0.05),
          border: `1px solid ${alpha(colors.oceanBlue, 0.1)}`,
        }}
      >
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {participants.length === 0
            ? 'No other participants have marked themselves as ready yet.'
            : error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        borderRadius: 2,
        border: `2px solid ${colors.oceanBlue}`,
        bgcolor: 'white',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          bgcolor: alpha(colors.oceanBlue, 0.08),
          px: 2,
          py: 1,
          borderBottom: `1px solid ${alpha(colors.oceanBlue, 0.15)}`,
        }}
      >
        <Typography variant="subtitle2" sx={{ color: colors.navyBlue, fontWeight: 600 }}>
          Other Participants' Picks
        </Typography>
      </Box>

      {/* Folder-style tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        variant="scrollable"
        scrollButtons="auto"
        TabIndicatorProps={{
          sx: {
            bgcolor: colors.oceanBlue,
            height: 3,
            bottom: 0,
          },
        }}
        sx={{
          borderBottom: `1px solid ${alpha(colors.oceanBlue, 0.2)}`,
          minHeight: 44,
          '& .MuiTabs-flexContainer': {
            gap: 0.5,
          },
          '& .MuiTab-root': {
            minHeight: 44,
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.85rem',
            color: colors.navyBlue,
            px: 1.5,
            '&.Mui-selected': {
              color: colors.oceanBlue,
              fontWeight: 600,
              bgcolor: alpha(colors.oceanBlue, 0.04),
            },
          },
        }}
      >
        {participants.map((p, index) => (
          <Tab
            key={p.uid}
            icon={<ParticipantTabLabel participant={p} />}
            iconPosition="start"
            id={`participant-tab-${index}`}
            aria-controls={`participant-panel-${index}`}
            sx={{ '& .MuiTab-iconWrapper': { mr: 0 } }}
          />
        ))}
      </Tabs>

      {/* Tab panels */}
      {participants.map((participant, index) => (
        <ParticipantPanel
          key={participant.uid}
          participant={participant}
          gameMap={gameMap}
          visible={activeTab === index}
        />
      ))}
    </Box>
  );
}
