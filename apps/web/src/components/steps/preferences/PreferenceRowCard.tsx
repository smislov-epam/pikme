import { Box, Button, Chip, IconButton, Typography } from '@mui/material'
import { useDraggable } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import ThumbDownAltIcon from '@mui/icons-material/ThumbDownAlt'
import ThumbDownOffAltIcon from '@mui/icons-material/ThumbDownOffAlt'
import type { GameRecord } from '../../../db/types'
import { colors } from '../../../theme/theme'

export interface PreferenceRowCardProps {
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
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}

export function PreferenceRowCard({
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
  dragHandleProps,
}: PreferenceRowCardProps) {
  const {
    onPointerDown: dragOnPointerDown,
    onMouseDown: dragOnMouseDown,
    onTouchStart: dragOnTouchStart,
    onKeyDown: dragOnKeyDown,
    ...dragHandleRest
  } = dragHandleProps ?? {}

  return (
    <Box
      role={onOpenDetails ? 'button' : undefined}
      tabIndex={onOpenDetails ? 0 : undefined}
      onClick={onOpenDetails}
      onKeyDown={
        onOpenDetails
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onOpenDetails()
              }
            }
          : undefined
      }
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1,
        bgcolor: 'background.default',
        borderRadius: '6px',
        border: '1px solid',
        borderColor: isDisliked ? 'error.light' : isTopPick ? colors.sand : 'divider',
        cursor: onOpenDetails ? 'pointer' : 'default',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      {dragHandleProps ? (
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
          sx={{ display: 'flex', alignItems: 'center', color: 'text.disabled', cursor: 'grab' }}
        >
          <DragIndicatorIcon fontSize="small" />
        </Box>
      ) : null}

      <Box
        component="img"
        src={game.thumbnail || '/vite.svg'}
        alt={game.name}
        sx={{ width: 36, height: 36, borderRadius: '6px', objectFit: 'cover', bgcolor: 'grey.200', flexShrink: 0 }}
        onError={(e) => {
          ;(e.target as HTMLImageElement).src = '/vite.svg'
        }}
      />

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {game.name}
        </Typography>
        {userRating ? (
          <Typography variant="caption" color="text.secondary">
            You ★ {userRating.toFixed(1)}
          </Typography>
        ) : null}
      </Box>

      {rank !== undefined ? (
        <Chip label={`#${rank}`} size="small" color="primary" sx={{ height: 20, minWidth: 44, fontWeight: 800 }} />
      ) : null}

      {onRank && nextRank ? (
        <Button
          size="small"
          variant="text"
          onClick={(e) => {
            e.stopPropagation()
            onRank(nextRank)
          }}
          sx={{ minWidth: 'auto', height: 44, px: 1 }}
        >
          #{nextRank}
        </Button>
      ) : null}

      <IconButton
        onClick={(e) => {
          e.stopPropagation()
          onToggleTopPick()
        }}
        aria-label={isTopPick ? 'Unstar top pick' : 'Star as top pick'}
        sx={{ width: 44, height: 44, color: isTopPick ? colors.sand : 'text.disabled', '&:hover': { color: colors.sand } }}
      >
        {isTopPick ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
      </IconButton>

      {onToggleDisliked ? (
        <IconButton
          onClick={(e) => {
            e.stopPropagation()
            onToggleDisliked()
          }}
          aria-label={isDisliked ? 'Remove dislike' : 'Mark disliked'}
          sx={{ width: 44, height: 44, color: isDisliked ? 'error.main' : 'text.disabled', '&:hover': { color: 'error.main' } }}
        >
          {isDisliked ? <ThumbDownAltIcon fontSize="small" /> : <ThumbDownOffAltIcon fontSize="small" />}
        </IconButton>
      ) : null}
    </Box>
  )
}

export function DraggablePreferenceRowCard(props: PreferenceRowCardProps & { id: number }) {
  const { id, ...rest } = props
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id })

  return (
    <Box
      ref={setNodeRef}
      sx={{ transform: CSS.Transform.toString(transform), opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 1000 : 'auto' }}
    >
      <PreferenceRowCard {...rest} dragHandleProps={{ ...attributes, ...listeners }} />
    </Box>
  )
}

export function SortablePreferenceRowCard(props: PreferenceRowCardProps & { id: number }) {
  const { id, ...rest } = props
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  }

  return (
    <Box ref={setNodeRef} style={style} {...attributes}>
      <PreferenceRowCard {...rest} dragHandleProps={listeners} />
    </Box>
  )
}
