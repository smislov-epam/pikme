import type { ReactNode } from 'react'
import {
  Box,
  Chip,
  Stack,
  Typography,
} from '@mui/material'
import type { GameRecord } from '../../db/types'
import { colors } from '../../theme/theme'

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
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            {game.minPlayers && game.maxPlayers ? (
              <Typography variant="caption" color="text.secondary">
                👥 {game.minPlayers === game.maxPlayers ? game.minPlayers : `${game.minPlayers}-${game.maxPlayers}`}
              </Typography>
            ) : null}
            {(game.minPlayTimeMinutes || game.maxPlayTimeMinutes || game.playingTimeMinutes) ? (
              <Typography variant="caption" color="text.secondary">
                ⏱️ {formatPlayTime(game)}
              </Typography>
            ) : null}
            {game.averageRating ? (
              <Chip
                label={`BGG ★ ${game.averageRating.toFixed(1)}`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  bgcolor: 'primary.light',
                  color: 'primary.dark',
                }}
              />
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
  if (min && max && min !== max) return `${min}-${max} min`
  if (min) return `${min} min`
  if (max) return `${max} min`
  if (avg) return `${avg} min`
  return ''
}
