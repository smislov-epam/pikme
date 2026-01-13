import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import TrophyIcon from '@mui/icons-material/EmojiEvents'
import GroupsIcon from '@mui/icons-material/Groups'
import ScheduleIcon from '@mui/icons-material/Schedule'
import PsychologyIcon from '@mui/icons-material/Psychology'
import { colors } from '../../../theme/theme'
import type { WizardFilters } from '../../../store/wizardTypes'
import type { GameWithScore } from '../ResultStep'

export function TonightsPickCard(props: {
  topPick: GameWithScore
  filters: WizardFilters
  onExcludeFromSession?: () => void
}) {
  const { topPick, filters, onExcludeFromSession } = props

  return (
    <Card
      sx={{
        background: `linear-gradient(135deg, ${colors.oceanBlue} 0%, ${colors.navyBlue} 100%)`,
        color: 'white',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {onExcludeFromSession ? (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 2,
          }}
        >
          <IconButton
            aria-label="Exclude from session"
            onClick={onExcludeFromSession}
            sx={{
              width: 44,
              height: 44,
              color: 'rgba(255,255,255,0.92)',
              bgcolor: 'rgba(0,0,0,0.18)',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.28)' },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      ) : null}
      <Box
        sx={{
          position: 'absolute',
          top: -16,
          left: 24,
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
        }}
      >
        <TrophyIcon fontSize="small" />
        TONIGHT'S PICK
      </Box>

      <CardContent sx={{ pt: 4, pb: 3 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          {topPick.game.name}
        </Typography>

        {topPick.game.yearPublished && (
          <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
            ({topPick.game.yearPublished})
          </Typography>
        )}

        <Stack direction="row" flexWrap="wrap" gap={1} mb={3}>
          {topPick.matchReasons.map((reason, i) => (
            <Chip
              key={i}
              label={reason}
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 500 }}
            />
          ))}
        </Stack>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', my: 2 }} />

        <Stack direction="row" spacing={3}>
          {topPick.game.minPlayers && topPick.game.maxPlayers && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <GroupsIcon fontSize="small" sx={{ opacity: 0.8 }} />
              <Typography variant="body2">
                {topPick.game.minPlayers}–{topPick.game.maxPlayers} players
              </Typography>
            </Box>
          )}
          {topPick.game.playingTimeMinutes && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ScheduleIcon fontSize="small" sx={{ opacity: 0.8 }} />
              <Typography variant="body2">{topPick.game.playingTimeMinutes} min</Typography>
            </Box>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PsychologyIcon fontSize="small" sx={{ opacity: 0.8 }} />
            <Typography variant="body2">
              {filters.mode === 'coop'
                ? 'Cooperative'
                : filters.mode === 'competitive'
                  ? 'Competitive'
                  : 'Any style'}
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ mt: 3 }}>
          <Stack direction="row" justifyContent="space-between" mb={0.5}>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              Group score
            </Typography>
            <Typography variant="caption" fontWeight={600}>
              {topPick.score} points
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={100}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: 'rgba(255,255,255,0.2)',
              '& .MuiLinearProgress-bar': { bgcolor: colors.sand },
            }}
          />
        </Box>
      </CardContent>
    </Card>
  )
}
