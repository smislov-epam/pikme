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
import { GameTile, type GameTileVariant } from './GameTile'

export interface GameCardProps {
  game: GameRecord
  isTopPick?: boolean
  isDisliked?: boolean
  rank?: number
  userRating?: number
  onOpenDetails?: () => void
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
  onOpenDetails,
  onToggleTopPick,
  onToggleDisliked,
  onRank,
  nextRank,
  isDraggable,
  dragHandleProps,
}: GameCardProps) {
  const variant: GameTileVariant = isDisliked ? 'disliked' : isTopPick ? 'topPick' : 'default'

  const {
    onPointerDown: dragOnPointerDown,
    onMouseDown: dragOnMouseDown,
    onTouchStart: dragOnTouchStart,
    onKeyDown: dragOnKeyDown,
    ...dragHandleRest
  } = dragHandleProps ?? {}

  const leading = (
    <Stack direction="row" spacing={1} alignItems="center">
      {isDraggable ? (
        <Box
          {...dragHandleRest}
          onPointerDown={(e) => {
            dragOnPointerDown?.(e)
            e.stopPropagation()
          }}
          onMouseDown={(e) => {
            dragOnMouseDown?.(e)
            e.stopPropagation()
          }}
          onTouchStart={(e) => {
            dragOnTouchStart?.(e)
            e.stopPropagation()
          }}
          onKeyDown={(e) => {
            dragOnKeyDown?.(e)
          }}
          sx={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'grab',
            touchAction: 'none',
            userSelect: 'none',
            color: 'text.disabled',
            '&:hover': { color: 'text.secondary' },
            '&:active': { cursor: 'grabbing' },
          }}
        >
          <DragIndicatorIcon fontSize="small" />
        </Box>
      ) : null}
    </Stack>
  )

  const trailing = rank !== undefined ? (
    <Chip
      label={`#${rank}`}
      size="small"
      color="primary"
      sx={{ height: 20, minWidth: 44, fontWeight: 800 }}
    />
  ) : null

  const trailingContent = (
    <Stack direction="row" spacing={0.5} alignItems="center">
      {trailing}

      {onRank && nextRank ? (
        <Button
          size="small"
          variant="text"
          onClick={(e) => {
            e.stopPropagation()
            onRank(nextRank)
          }}
          sx={{ minWidth: 'auto', height: 32, px: 1 }}
        >
          #{nextRank}
        </Button>
      ) : null}

      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation()
          onToggleTopPick()
        }}
        aria-label={isTopPick ? 'Unstar top pick' : 'Star as top pick'}
        sx={{
          color: isTopPick ? colors.sand : 'text.disabled',
          '&:hover': { color: colors.sand },
        }}
      >
        {isTopPick ? <StarIcon /> : <StarBorderIcon />}
      </IconButton>

      {onToggleDisliked ? (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation()
            onToggleDisliked()
          }}
          aria-label={isDisliked ? 'Remove dislike' : 'Mark disliked'}
          sx={{
            color: isDisliked ? 'error.main' : 'text.disabled',
            '&:hover': { color: 'error.main' },
          }}
        >
          {isDisliked ? <ThumbDownAltIcon /> : <ThumbDownOffAltIcon />}
        </IconButton>
      ) : null}
    </Stack>
  )

  return (
    <GameTile
      game={game}
      variant={variant}
      leading={leading}
      trailing={trailingContent}
      onClick={onOpenDetails}
    >
      {userRating ? (
        <Chip
          label={`You ★ ${userRating.toFixed(1)}`}
          size="small"
          sx={{
            height: 20,
            fontSize: '0.7rem',
            bgcolor: 'secondary.light',
            color: 'text.primary',
          }}
        />
      ) : null}

      {isTopPick ? (
        <Typography variant="caption" color="text.secondary">
          Top pick
        </Typography>
      ) : null}
      {isDisliked ? (
        <Typography variant="caption" color="text.secondary">
          Disliked
        </Typography>
      ) : null}
    </GameTile>
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
  onOpenDetails?: () => void
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
  onOpenDetails,
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
        onOpenDetails={onOpenDetails}
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
