import {
  Box,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import type { GameRecord } from '../../db/types'

export function GameEditFieldsPane(props: {
  game: GameRecord
  onChange: (field: keyof GameRecord, value: unknown) => void
}) {
  const { game, onChange } = props

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Game Details
        </Typography>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Min Players"
              type="number"
              size="small"
              value={game.minPlayers ?? ''}
              onChange={(e) => onChange('minPlayers', e.target.value ? Number(e.target.value) : undefined)}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Max Players"
              type="number"
              size="small"
              value={game.maxPlayers ?? ''}
              onChange={(e) => onChange('maxPlayers', e.target.value ? Number(e.target.value) : undefined)}
              sx={{ flex: 1 }}
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Min Time (min)"
              type="number"
              size="small"
              value={game.minPlayTimeMinutes ?? ''}
              onChange={(e) => onChange('minPlayTimeMinutes', e.target.value ? Number(e.target.value) : undefined)}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Max Time (min)"
              type="number"
              size="small"
              value={game.maxPlayTimeMinutes ?? ''}
              onChange={(e) => onChange('maxPlayTimeMinutes', e.target.value ? Number(e.target.value) : undefined)}
              sx={{ flex: 1 }}
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Min Age"
              type="number"
              size="small"
              value={game.minAge ?? ''}
              onChange={(e) => onChange('minAge', e.target.value ? Number(e.target.value) : undefined)}
              sx={{ flex: 1, maxWidth: { sm: 160 } }}
            />
          </Stack>
        </Stack>
      </Box>
    </Stack>
  )
}
