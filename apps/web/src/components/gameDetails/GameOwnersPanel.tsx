import { useMemo, useState } from 'react'
import { Autocomplete, Box, Chip, Stack, TextField, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import type { GameRecord, UserRecord } from '../../db/types'

export function GameOwnersPanel(props: {
  game: GameRecord
  owners: string[]
  users: UserRecord[]
  onAddOwner?: (username: string, bggId: number) => Promise<void>
  onRemoveOwner?: (username: string, bggId: number) => Promise<void>
}) {
  const { game, owners, users, onAddOwner, onRemoveOwner } = props

  const [addingOwner, setAddingOwner] = useState(false)

  const availableOwners = useMemo(() => {
    return users.filter((u) => !owners.includes(u.username))
  }, [owners, users])

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: 1.25,
        bgcolor: 'background.paper',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
        <Typography variant="subtitle2" fontWeight={700}>
          Owners
        </Typography>
      </Stack>

      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
        {owners.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No owners yet.
          </Typography>
        ) : (
          owners.map((owner) => (
            <Chip
              key={owner}
              size="small"
              label={owner}
              onDelete={onRemoveOwner ? () => onRemoveOwner(owner, game.bggId) : undefined}
              deleteIcon={<DeleteIcon sx={{ fontSize: 16, color: 'white' }} />}
              sx={{ height: 26 }}
            />
          ))
        )}

        {onAddOwner && availableOwners.length > 0 && !addingOwner ? (
          <Chip
            size="small"
            icon={<AddIcon sx={{ fontSize: 16 }} />}
            label="Add owner"
            variant="outlined"
            onClick={() => setAddingOwner(true)}
            sx={{ height: 26, cursor: 'pointer' }}
          />
        ) : null}

        {addingOwner && onAddOwner ? (
          <Autocomplete
            size="small"
            options={availableOwners}
            getOptionLabel={(u) => u.displayName || u.username}
            onChange={(_, u) => {
              if (!u) return
              void onAddOwner(u.username, game.bggId)
              setAddingOwner(false)
            }}
            onBlur={() => setAddingOwner(false)}
            sx={{ minWidth: 180 }}
            renderInput={(params) => (
              <TextField {...params} autoFocus placeholder="Select player…" size="small" />
            )}
          />
        ) : null}
      </Stack>
    </Box>
  )
}
