import {
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import ThumbDownOffAltIcon from '@mui/icons-material/ThumbDownOffAlt'
import ThumbDownAltIcon from '@mui/icons-material/ThumbDownAlt'
import type { GameRecord } from '../../db/types'
import { colors } from '../../theme/theme'

export interface GameCardProps {
  game: GameRecord
  isTopPick?: boolean
  isDisliked?: boolean
  rank?: number
  userRating?: number
  onToggleTopPick: () => void
  onToggleDisliked?: () => void
  onRank?: (rank: number) => void
  nextRank?: number
  isDraggable?: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}

export function GameCard({
  game,
  isTopPick,
  isDisliked,
  rank,
  userRating,
  onToggleTopPick,
  onToggleDisliked,
  onRank,
  nextRank,
  isDraggable,
  dragHandleProps,
}: GameCardProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 1.5,
        bgcolor: isDisliked ? 'action.selected' : isTopPick ? colors.sand + '20' : 'background.default',
        borderRadius: 2,
        border: '1px solid',
        borderColor: isDisliked ? 'error.light' : isTopPick ? colors.sand : 'divider',
        transition: 'all 0.2s',
        '&:hover': {
          borderColor: 'primary.light',
          bgcolor: 'action.hover',
        },
      }}
    >
      {/* Drag Handle */}
      {isDraggable && (
        <Box
          {...dragHandleProps}
          sx={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'grab',
            color: 'text.disabled',
            '&:hover': { color: 'text.secondary' },
            '&:active': { cursor: 'grabbing' },
          }}
        >
          <DragIndicatorIcon fontSize="small" />
        </Box>
      )}

      {rank !== undefined && (
        <Chip
          label={rank}
          size="small"
          color="primary"
          sx={{ minWidth: 32, fontWeight: 700 }}
        />
      )}

      {/* Game Thumbnail */}
      <Box
        component="img"
        src={game.thumbnail || '/vite.svg'}
        alt={game.name}
        sx={{
          width: 48,
          height: 48,
          borderRadius: 1.5,
          objectFit: 'cover',
          bgcolor: 'grey.200',
          flexShrink: 0,
        }}
        onError={(e) => {
          (e.target as HTMLImageElement).src = '/vite.svg'
        }}
      />

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography fontWeight={500} noWrap>
          {game.name}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          {game.minPlayers && game.maxPlayers && (
            <Typography variant="caption" color="text.secondary">
              👥 {game.minPlayers}–{game.maxPlayers}
            </Typography>
          )}
          {game.playingTimeMinutes && (
            <Typography variant="caption" color="text.secondary">
              ⏱️ {game.playingTimeMinutes}min
            </Typography>
          )}
          {userRating && (
            <Chip
              label={`★ ${userRating.toFixed(1)}`}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.7rem',
                bgcolor: 'primary.light',
                color: 'primary.dark',
              }}
            />
          )}
        </Stack>
      </Box>

      <IconButton
        size="small"
        onClick={onToggleTopPick}
        sx={{
          color: isTopPick ? colors.sand : 'text.disabled',
          '&:hover': { color: colors.sand },
        }}
      >
        {isTopPick ? <StarIcon /> : <StarBorderIcon />}
      </IconButton>

      {onToggleDisliked && (
        <IconButton
          size="small"
          onClick={onToggleDisliked}
          sx={{
            color: isDisliked ? 'error.main' : 'text.disabled',
            '&:hover': { color: 'error.main' },
          }}
        >
          {isDisliked ? <ThumbDownAltIcon /> : <ThumbDownOffAltIcon />}
        </IconButton>
      )}

      {onRank && nextRank && (
        <Button
          size="small"
          variant="text"
          onClick={() => onRank(nextRank)}
          sx={{ minWidth: 'auto' }}
        >
          #{nextRank}
        </Button>
      )}
    </Box>
  )
}

// Sortable wrapper for GameCard
export interface SortableGameCardProps {
  id: number
  game: GameRecord
  rank?: number
  userRating?: number
  isTopPick?: boolean
  isDisliked?: boolean
  onToggleTopPick: () => void
  onToggleDisliked?: () => void
  onRank?: (rank: number) => void
  nextRank?: number
}

export function SortableGameCard({
  id,
  game,
  rank,
  userRating,
  isTopPick,
  isDisliked,
  onToggleTopPick,
  onToggleDisliked,
  onRank,
  nextRank,
}: SortableGameCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  }

  return (
    <Box ref={setNodeRef} style={style} {...attributes}>
      <GameCard
        game={game}
        rank={rank}
        userRating={userRating}
        onToggleTopPick={onToggleTopPick}
        isTopPick={isTopPick}
        isDisliked={isDisliked}
        onToggleDisliked={onToggleDisliked}
        onRank={onRank}
        nextRank={nextRank}
        isDraggable
        dragHandleProps={listeners}
      />
    </Box>
  )
}
