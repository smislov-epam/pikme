import { IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import type { GameRecord } from '../../../db/types'
import { GameTile } from '../GameTile'

export interface FilteredGameCardProps {
  game: GameRecord
  onExclude: () => void
  onOpenDetails: () => void
}

export function FilteredGameCard({ game, onExclude, onOpenDetails }: FilteredGameCardProps) {
  return (
    <GameTile
      game={game}
      onClick={onOpenDetails}
      actions={
        <IconButton size="small" onClick={onExclude} aria-label="Exclude from session" sx={{ color: 'error.main' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      }
    />
  )
}
