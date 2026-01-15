import {
  Badge,
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import PeopleIcon from '@mui/icons-material/People'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import StarIcon from '@mui/icons-material/Star'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import EditIcon from '@mui/icons-material/Edit'
import NotesIcon from '@mui/icons-material/Notes'
import type { GameRecord } from '../../db/types'
import { formatPlayTime, getComplexityLabel } from '../gameEdit/gameEditUtils'
import { colors } from '../../theme/theme'

export function GameDetailsSummaryPanel(props: {
  game: GameRecord
  onEdit?: () => void
  notesCount?: number
  showNotes?: boolean
  onToggleNotes?: () => void
}) {
  const { game, onEdit, notesCount = 0, showNotes = false, onToggleNotes } = props
  const statChipSx = {
    height: 28,
    bgcolor: colors.sand,
    color: colors.navyBlue,
    borderColor: colors.sand,
    fontWeight: 600,
    '& .MuiChip-icon': { color: colors.navyBlue },
  } as const

  return (
    <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <CardContent
        sx={{
          p: 0,
          '&:last-child': { pb: 0 },
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '200px 1fr' },
          columnGap: { xs: 0, sm: 2 },
          rowGap: 2,
          alignItems: 'stretch',
          minHeight: { xs: 'auto', sm: 240 },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            overflow: 'hidden',
            height: { xs: 220, sm: '100%' },
            maxHeight: { xs: 260, sm: 'none' },
            minHeight: { xs: 180, sm: '100%' },
          }}
        >
          <Box
            component="img"
            src={game.thumbnail || '/vite.svg'}
            alt={game.name}
            sx={{ width: '100%', height: '100%', maxHeight: '100%', objectFit: 'cover', display: 'block' }}
            onError={(e) => {
              ;(e.target as HTMLImageElement).src = '/vite.svg'
            }}
          />
        </Box>

        <Stack spacing={1.25} sx={{ minWidth: 0, p: { xs: 2, sm: 2.5 } }}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" fontWeight={700} noWrap>
                {game.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                BGG #{game.bggId}{game.yearPublished ? ` • ${game.yearPublished}` : ''}
              </Typography>
            </Box>

            <Stack direction="row" spacing={0.5} alignItems="center" flexShrink={0}>
              {onToggleNotes ? (
                <Tooltip title={showNotes ? 'Hide notes' : 'Show notes'}>
                  <IconButton
                    size="small"
                    color={showNotes ? 'primary' : 'default'}
                    onClick={onToggleNotes}
                    sx={{ width: 36, height: 36 }}
                    aria-label={showNotes ? 'Hide notes' : 'Show notes'}
                  >
                    <Badge badgeContent={notesCount} color="primary" max={99}>
                      <NotesIcon fontSize="small" />
                    </Badge>
                  </IconButton>
                </Tooltip>
              ) : null}
              {onEdit ? (
                <Tooltip title="Edit game">
                  <IconButton size="small" color="primary" onClick={onEdit} sx={{ width: 36, height: 36 }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : null}
              <Tooltip title="View on BGG">
                <IconButton
                  size="small"
                  component="a"
                  href={`https://boardgamegeek.com/boardgame/${game.bggId}`}
                  target="_blank"
                  rel="noreferrer"
                  sx={{ width: 36, height: 36 }}
                  color="primary"
                >
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            {game.minPlayers && game.maxPlayers ? (
              <Chip
                icon={<PeopleIcon />}
                label={`${game.minPlayers}-${game.maxPlayers} players`}
                sx={statChipSx}
              />
            ) : null}
            {(game.playingTimeMinutes || game.minPlayTimeMinutes || game.maxPlayTimeMinutes) ? (
              <Chip
                icon={<AccessTimeIcon />}
                label={formatPlayTime(game)}
                sx={statChipSx}
              />
            ) : null}
            {game.averageRating ? (
              <Chip
                icon={<StarIcon sx={{ color: colors.navyBlue }} />}
                label={`${game.averageRating.toFixed(1)}/10`}
                sx={statChipSx}
              />
            ) : null}
            {game.weight ? (
              <Chip
                label={`${getComplexityLabel(game.weight)} (${game.weight.toFixed(1)}/5)`}
                sx={statChipSx}
              />
            ) : null}
            {game.bestWith ? (
              <Chip
                icon={<StarIcon sx={{ color: colors.navyBlue }} />}
                label={`Best with ${game.bestWith}`}
                sx={statChipSx}
              />
            ) : null}
            {game.minAge ? (
              <Chip label={`Age: ${game.minAge}+`} sx={statChipSx} />
            ) : null}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}
