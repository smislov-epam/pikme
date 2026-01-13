import { useState } from 'react'
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Collapse,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import PeopleIcon from '@mui/icons-material/People'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import StarIcon from '@mui/icons-material/Star'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'
import CloseIcon from '@mui/icons-material/Close'
import type { GameRecord, UserRecord } from '../../db/types'

export interface GameRowProps {
  game: GameRecord
  owners: string[]
  users: UserRecord[]
  isExpanded: boolean
  isInSession: boolean
  onToggle: () => void
  onRemoveOwner?: (username: string, bggId: number) => Promise<void>
  onAddOwner?: (username: string, bggId: number) => Promise<void>
  onRemoveFromSession?: (bggId: number) => void
  onExcludeFromSession?: () => void
  onEdit?: () => void
}

export function GameRow({
  game, owners, users, isExpanded, isInSession, onToggle,
  onRemoveOwner, onAddOwner, onRemoveFromSession, onExcludeFromSession, onEdit,
}: GameRowProps) {
  const [addingOwner, setAddingOwner] = useState(false)
  const availableOwners = users.filter(u => !owners.includes(u.username))

  return (
    <Box
      sx={{
        position: 'relative',
        bgcolor: 'background.default',
        borderRadius: '8px',
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
      }}
    >
      <Box
        onClick={onToggle}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          p: 1.25,
          pr: 8,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <Box
          component="img"
          src={game.thumbnail || '/vite.svg'}
          alt={game.name}
          sx={{ width: 36, height: 36, borderRadius: '6px', objectFit: 'cover', bgcolor: 'grey.200', flexShrink: 0 }}
          onError={(e) => { (e.target as HTMLImageElement).src = '/vite.svg' }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={500} noWrap>{game.name}</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            {game.minPlayers && game.maxPlayers && (
              <Typography variant="caption" color="text.secondary">
                👥 {game.minPlayers === game.maxPlayers ? game.minPlayers : `${game.minPlayers}-${game.maxPlayers}`}
              </Typography>
            )}
            {(game.minPlayTimeMinutes || game.maxPlayTimeMinutes || game.playingTimeMinutes) && (
              <Typography variant="caption" color="text.secondary">
                ⏱️ {formatPlayTime(game)}
              </Typography>
            )}
            {game.averageRating && (
              <Typography variant="caption" color="text.secondary">⭐ {game.averageRating.toFixed(1)}</Typography>
            )}
          </Stack>
        </Box>
        {owners.length > 0 && (
          <Chip label={owners.length === 1 ? owners[0] : `${owners.length}`} size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
        )}
      </Box>

      <Box
        sx={{
          position: 'absolute',
          top: 6,
          right: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          zIndex: 2,
          '& .MuiIconButton-root': { width: 40, height: 40 },
        }}
      >
        {onExcludeFromSession ? (
          <Tooltip title="Exclude from session">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation()
                onExcludeFromSession()
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null}

        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
        >
          {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Box>

      <Collapse in={isExpanded}>
        <Box sx={{ px: 1.5, pb: 1.5, pt: 0.5, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider' }}>
          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2" fontWeight={600}>
                {game.name} {game.yearPublished && `(${game.yearPublished})`}
              </Typography>
              <Stack direction="row" spacing={0.5}>
                {onEdit && (
                  <Tooltip title="Edit game">
                    <IconButton size="small" onClick={onEdit} sx={{ p: 0.25 }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="View on BGG">
                  <IconButton size="small" href={`https://boardgamegeek.com/boardgame/${game.bggId}`} target="_blank" component="a" sx={{ p: 0.25 }}>
                    <OpenInNewIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>

            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              {game.minPlayers && game.maxPlayers && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <PeopleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2">{game.minPlayers === game.maxPlayers ? game.minPlayers : `${game.minPlayers}-${game.maxPlayers}`} players</Typography>
                </Stack>
              )}
              {game.bestWith && (
                <Chip label={`Best: ${game.bestWith}`} size="small" sx={{ height: 22, bgcolor: 'success.light', color: 'success.dark' }} />
              )}
              {(game.minPlayTimeMinutes || game.maxPlayTimeMinutes || game.playingTimeMinutes) && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <AccessTimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2">{formatPlayTime(game)}</Typography>
                </Stack>
              )}
              {game.minAge && <Typography variant="body2" color="text.secondary">🎂 {game.minAge}+</Typography>}
              {game.averageRating && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                  <Typography variant="body2">{game.averageRating.toFixed(1)} / 10</Typography>
                </Stack>
              )}
              {game.weight && (
                <Chip label={`${getComplexityLabel(game.weight)} (${game.weight.toFixed(1)}/5)`} size="small" sx={{ height: 22, bgcolor: getComplexityColor(game.weight), color: 'white' }} />
              )}
            </Stack>

            {game.categories && game.categories.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary">Categories</Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.25 }}>
                  {game.categories.map((cat) => <Chip key={cat} label={cat} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />)}
                </Stack>
              </Box>
            )}

            {game.mechanics && game.mechanics.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary">Mechanics</Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.25 }}>
                  {game.mechanics.map((mech) => <Chip key={mech} label={mech} size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'primary.light' }} />)}
                </Stack>
              </Box>
            )}

            {game.description && (
              <Box>
                <Typography variant="caption" color="text.secondary">Description</Typography>
                <Typography variant="body2" sx={{ mt: 0.25, color: 'text.secondary', fontSize: '0.8rem' }}>
                  {game.description.length > 200 ? `${game.description.slice(0, 200)}...` : game.description}
                </Typography>
              </Box>
            )}

            {game.userNotes && (
              <Box sx={{ bgcolor: 'warning.light', p: 1, borderRadius: 1, opacity: 0.9 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>📝 Your Notes</Typography>
                <Typography variant="body2" sx={{ mt: 0.25, fontSize: '0.8rem' }}>
                  {game.userNotes}
                </Typography>
              </Box>
            )}

            <Box>
              <Typography variant="caption" color="text.secondary">Owned by</Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.25, alignItems: 'center' }}>
                {owners.map((owner) => (
                  <Chip key={owner} label={owner} size="small" onDelete={onRemoveOwner ? () => onRemoveOwner(owner, game.bggId) : undefined} deleteIcon={<DeleteIcon sx={{ fontSize: 14 }} />} sx={{ height: 24 }} />
                ))}
                {onAddOwner && availableOwners.length > 0 && !addingOwner && (
                  <Chip label="Add owner" size="small" icon={<AddIcon sx={{ fontSize: 14 }} />} onClick={() => setAddingOwner(true)} variant="outlined" sx={{ height: 24, cursor: 'pointer' }} />
                )}
                {addingOwner && onAddOwner && (
                  <Autocomplete
                    size="small"
                    options={availableOwners}
                    getOptionLabel={(u) => u.displayName || u.username}
                    onChange={(_, u) => { if (u) { onAddOwner(u.username, game.bggId); setAddingOwner(false) } }}
                    onBlur={() => setAddingOwner(false)}
                    sx={{ minWidth: 120 }}
                    renderInput={(params) => <TextField {...params} autoFocus placeholder="Select..." size="small" />}
                  />
                )}
              </Stack>
            </Box>

            {isInSession && (onRemoveFromSession || onExcludeFromSession) && (
              <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
                <Button
                  size="small"
                  color="warning"
                  startIcon={<RemoveCircleOutlineIcon />}
                  onClick={() => (onExcludeFromSession ? onExcludeFromSession() : onRemoveFromSession?.(game.bggId))}
                >
                  Exclude from session
                </Button>
              </Box>
            )}
          </Stack>
        </Box>
      </Collapse>
    </Box>
  )
}

function getComplexityLabel(weight: number): string {
  if (weight < 1.5) return 'Light'
  if (weight < 2.5) return 'Easy'
  if (weight < 3.5) return 'Medium'
  if (weight < 4.5) return 'Heavy'
  return 'Complex'
}

function getComplexityColor(weight: number): string {
  if (weight < 1.5) return '#4caf50'
  if (weight < 2.5) return '#8bc34a'
  if (weight < 3.5) return '#ff9800'
  if (weight < 4.5) return '#f44336'
  return '#9c27b0'
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
