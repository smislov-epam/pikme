import type { ReactNode } from 'react'
import {
  Box,
  Stack,
  Typography,
} from '@mui/material'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined'
import StarOutlinedIcon from '@mui/icons-material/StarOutlined'
import type { GameRecord } from '../../db/types'
import { colors } from '../../theme/theme'
import { StatPill } from '../ui/StatPill'

export type GameTileVariant = 'default' | 'topPick' | 'disliked'

export function GameTile(props: {
  game: GameRecord
  variant?: GameTileVariant
  leading?: ReactNode
  trailing?: ReactNode
  actions?: ReactNode
  onClick?: () => void
  children?: ReactNode
}) {
  const { game, variant = 'default', leading, trailing, actions, onClick, children } = props

  const borderColor =
    variant === 'disliked'
      ? 'error.light'
      : variant === 'topPick'
        ? colors.sand
        : 'divider'

  const background =
    variant === 'disliked'
      ? 'action.selected'
      : variant === 'topPick'
        ? colors.sand + '14'
        : 'background.default'

  return (
    <Box
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      sx={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        p: 1.5,
        pr: actions ? 6.5 : 1.5,
        bgcolor: background,
        borderRadius: '6px',
        border: '1px solid',
        borderColor,
        overflow: 'hidden',
        transition: 'border-color 140ms ease, background-color 140ms ease',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': {
          borderColor: 'primary.light',
          bgcolor: 'action.hover',
        },
      }}
    >
      {actions ? (
        <Box
          onClick={(e) => e.stopPropagation()}
          sx={{
            position: 'absolute',
            top: 6,
            right: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            zIndex: 2,
            '& .MuiIconButton-root': {
              width: 36,
              height: 36,
            },
          }}
        >
          {actions}
        </Box>
      ) : null}

      <Stack direction="row" spacing={1.5} alignItems="center">
        {leading ? <Box sx={{ display: 'flex', alignItems: 'center' }}>{leading}</Box> : null}

        <Box
          component="img"
          src={game.thumbnail || '/vite.svg'}
          alt={game.name}
          sx={{
            width: 48,
            height: 48,
            borderRadius: '6px',
            objectFit: 'cover',
            bgcolor: 'grey.200',
            flexShrink: 0,
          }}
          onError={(e) => {
            ;(e.target as HTMLImageElement).src = '/vite.svg'
          }}
        />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontWeight={600} noWrap>
            {game.name}
          </Typography>
          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
            {game.minPlayers && game.maxPlayers ? (
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
        </Box>

        {trailing ? (
          <Box
            onClick={(e) => e.stopPropagation()}
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}
          >
            {trailing}
          </Box>
        ) : null}
      </Stack>

      {children}
    </Box>
  )
}

function formatPlayTime(game: GameRecord): string {
  const min = game.minPlayTimeMinutes
  const max = game.maxPlayTimeMinutes
  const avg = game.playingTimeMinutes
  if (min && max && min !== max) return `${min}-${max}`
  if (min) return `${min}`
  if (max) return `${max}`
  if (avg) return `${avg}`
  return ''
}
