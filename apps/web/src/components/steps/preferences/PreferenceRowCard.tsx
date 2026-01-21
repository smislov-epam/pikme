import { Box, Button, IconButton, Typography } from '@mui/material'
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
import { StatPill } from '../../ui/StatPill'
import { getGameImageOrPlaceholder } from '../../../services/ui/gameImage'

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
  // userRating reserved for future display of BGG rating badge
  userRating: _userRating = undefined,
  onOpenDetails,
  onToggleTopPick,
  onToggleDisliked,
  onRank,
  nextRank,
  dragHandleProps,
}: PreferenceRowCardProps) {
  void _userRating // suppress unused warning
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
        gap: 0.75,
        p: 0.75,
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
          sx={{ display: 'flex', alignItems: 'center', color: 'text.disabled', cursor: 'grab', touchAction: 'none', userSelect: 'none' }}
        >
          <DragIndicatorIcon fontSize="small" />
        </Box>
      ) : null}

      <Box
        component="img"
        src={getGameImageOrPlaceholder(game)}
        alt={game.name}
        sx={{ width: 36, height: 36, borderRadius: '6px', objectFit: 'cover', bgcolor: 'grey.200', flexShrink: 0 }}
        onError={(e) => {
          const target = e.target as HTMLImageElement
          const fallback = getGameImageOrPlaceholder(game)
          if (target.src !== fallback) {
            target.src = fallback
          }
        }}
      />

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {game.name}
        </Typography>
      </Box>

      {rank !== undefined ? (
        <StatPill label={`#${rank}`} sx={{ minWidth: 44 }} />
      ) : null}

      {onRank && nextRank ? (
        <Button
          size="small"
          variant="text"
          onClick={(e) => {
            e.stopPropagation()
            onRank(nextRank)
          }}
          sx={{ minWidth: 'auto', height: 36, px: 0.5 }}
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
        sx={{ width: 36, height: 36, color: isTopPick ? colors.sand : 'text.disabled', '&:hover': { color: colors.sand } }}
      >
        {isTopPick ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
      </IconButton>

      {onToggleDisliked ? (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation()
            onToggleDisliked()
          }}
          aria-label={isDisliked ? 'Remove dislike' : 'Mark disliked'}
          sx={{ width: 36, height: 36, color: isDisliked ? 'error.main' : 'text.disabled', '&:hover': { color: 'error.main' } }}
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
