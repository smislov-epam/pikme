import { Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import CloseIcon from '@mui/icons-material/Close'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined'
import StarOutlinedIcon from '@mui/icons-material/StarOutlined'
import type { GameRecord } from '../../db/types'
import type { ReactNode } from 'react'
import { StatPill } from '../ui/StatPill'

export interface GameRowProps {
  game: GameRecord
  owners: string[]
  variant?: 'standard' | 'compact'
  hidePlayerCount?: boolean
  onRowClick?: () => void
  onExcludeFromSession?: () => void
  onOpenDetails?: () => void
  metaRight?: ReactNode
}

export function GameRow({
  game,
  owners,
  variant = 'standard',
  hidePlayerCount,
  onRowClick,
  onExcludeFromSession,
  onOpenDetails,
  metaRight,
}: GameRowProps) {
  const isCompact = variant === 'compact'

  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        borderRadius: '6px',
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
      }}
    >
      <Box
        onClick={onRowClick ?? onOpenDetails}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: isCompact ? 0.75 : 1.5,
          p: isCompact ? 0 : 1.25,
          pr: metaRight ? 1.3 : isCompact ? 0 : 1.25,
          minHeight: isCompact ? 44 : undefined,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <Box
          component="img"
          src={game.thumbnail || '/vite.svg'}
          alt={game.name}
          sx={{
            width: isCompact ? 44 : 36,
            height: isCompact ? 44 : 36,
            borderRadius: isCompact ? 0 : '6px',
            objectFit: 'cover',
            bgcolor: 'grey.200',
            flexShrink: 0,
          }}
          onError={(e) => { (e.target as HTMLImageElement).src = '/vite.svg' }}
        />
        <Box sx={{ flex: 1, minWidth: 0, py: isCompact ? 0.25 : 0 }}>
          <Typography variant={isCompact ? 'body2' : 'body2'} fontWeight={500} noWrap>
            {game.name}
          </Typography>
          {!isCompact ? (
            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
              {!hidePlayerCount && game.minPlayers && game.maxPlayers ? (
                <StatPill
                  icon={<GroupsOutlinedIcon />}
                  label={game.minPlayers === game.maxPlayers ? `${game.minPlayers}` : `${game.minPlayers}-${game.maxPlayers}`}
                />
              ) : null}
              {(game.minPlayTimeMinutes || game.maxPlayTimeMinutes || game.playingTimeMinutes) ? (
                <StatPill icon={<ScheduleOutlinedIcon />} label={formatPlayTime(game)} />
              ) : null}
              {game.averageRating ? (
                <StatPill icon={<StarOutlinedIcon />} label={game.averageRating.toFixed(1)} />
              ) : null}
            </Stack>
          ) : null}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, pr: isCompact ? 0.25 : 0 }}>
          {metaRight ? metaRight : null}
          {!isCompact && owners.length > 0 ? (
            <Chip
              label={owners.length === 1 ? owners[0] : `${owners.length}`}
              size="small"
              sx={{ height: 20, fontSize: '0.65rem' }}
            />
          ) : null}

          {onExcludeFromSession ? (
            <Tooltip title="Remove from session">
              <IconButton
                size="small"
                sx={{ width: 44, height: 44, color: 'error.main' }}
                onClick={(e) => {
                  e.stopPropagation()
                  onExcludeFromSession()
                }}
                aria-label="Remove from session"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
          {onOpenDetails ? (
            <Tooltip title="Open details">
              <IconButton
                size="small"
                sx={{ width: 44, height: 44 }}
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenDetails()
                }}
              >
                <InfoOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
        </Box>
      </Box>
    </Box>
  )
}

function formatPlayTime(game: GameRecord): string {
  const min = game.minPlayTimeMinutes
  const max = game.maxPlayTimeMinutes
  const avg = game.playingTimeMinutes
  if (min && max && min !== max) return `${min}-${max} min`
  if (min) return `${min} min`
  if (max) return `${max} min`
  if (avg) return `${avg} min`
  return ''
}
