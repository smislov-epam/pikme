import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  Stack,
  Typography,
  alpha,
} from '@mui/material'
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
  onOpenDetails?: () => void
}) {
  const { topPick, filters, onOpenDetails } = props
  const bgImage = topPick.game.image || topPick.game.thumbnail || '/vite.svg'

  return (
    <Card
      sx={{
        background: 'transparent',
        backgroundColor: 'transparent',
        color: 'white',
        position: 'relative',
        overflow: 'visible',
        cursor: onOpenDetails ? 'pointer' : 'default',
      }}
      role={onOpenDetails ? 'button' : undefined}
      tabIndex={onOpenDetails ? 0 : undefined}
      onClick={onOpenDetails}
      onKeyDown={(e) => {
        if (!onOpenDetails) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpenDetails()
        }
      }}
    >
      {/* Keep image + overlay clipped, but let the badge overflow */}
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
        <TrophyIcon fontSize="small" />
        TONIGHT'S PICK
      </Box>

      <CardContent sx={{ pt: 4, pb: 3, position: 'relative', zIndex: 1 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              {topPick.game.name}
            </Typography>

            {topPick.game.yearPublished && (
              <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
                ({topPick.game.yearPublished})
              </Typography>
            )}
          </Box>

          <Chip
            label={`${topPick.score} pts`}
            color="secondary"
            size="small"
            sx={{ fontWeight: 700, alignSelf: 'flex-start', bgcolor: colors.sand, color: colors.navyBlue }}
          />
        </Stack>

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
