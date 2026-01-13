import { Box } from '@mui/material'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { GameRecord } from '../../db/types'
import { GameCard } from './PreferenceGameCard'

export interface DraggableGameCardProps {
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

export function DraggableGameCard({
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
}: DraggableGameCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id })

  return (
    <Box
      ref={setNodeRef}
      sx={{
        transform: CSS.Transform.toString(transform),
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1000 : 'auto',
      }}
    >
      <GameCard
        game={game}
        rank={rank}
        userRating={userRating}
        isTopPick={isTopPick}
        isDisliked={isDisliked}
        onOpenDetails={onOpenDetails}
        onToggleTopPick={onToggleTopPick}
        onToggleDisliked={onToggleDisliked}
        onRank={onRank}
        nextRank={nextRank}
        isDraggable
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </Box>
  )
}
