import { useCallback, useMemo, useState } from 'react'
import HistoryIcon from '@mui/icons-material/History'
import CloseIcon from '@mui/icons-material/Close'
import SportsEsportsIcon from '@mui/icons-material/SportsEsports'
import {
  Autocomplete,
  Box,
  Button,
  Card,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import type { SavedNightRecord } from '../../../db/types'

type SavedNightOption = {
  id: number
  label: string
  description?: string
  date: string
  gameCount: number
  players: string[]
  organizerUsername?: string
}

export function SavedNightPicker(props: {
  savedNights: SavedNightRecord[]
  onLoadSavedNight: (id: number, options?: { includeGames?: boolean }) => Promise<void>
  onAfterLoad?: () => void
}) {
  const { savedNights, onLoadSavedNight, onAfterLoad } = props

  const [pendingSavedNightId, setPendingSavedNightId] = useState<number | null>(null)
  const [includeGames, setIncludeGames] = useState(true)

  const savedNightOptions: SavedNightOption[] = useMemo(
    () =>
      savedNights
        .filter((n): n is SavedNightRecord & { id: number } => typeof n.id === 'number')
        .map((night) => ({
          id: night.id,
          label: night.data.name,
          description: night.data.description,
          date: new Date(night.createdAt).toLocaleDateString(),
          gameCount: night.data.gameIds?.length ?? 0,
          players: night.data.usernames,
          organizerUsername: night.data.organizerUsername,
        })),
    [savedNights],
  )

  const pendingNight = useMemo(
    () => (pendingSavedNightId ? savedNightOptions.find((n) => n.id === pendingSavedNightId) : undefined),
    [pendingSavedNightId, savedNightOptions],
  )

  const playersSummary = useCallback((players: string[]) => {
    if (players.length <= 2) return players.join(', ')
    return `${players.slice(0, 2).join(', ')} +${players.length - 2}`
  }, [])

  if (savedNightOptions.length === 0) return null

  return (
    <>
      <Autocomplete
        options={savedNightOptions}
        getOptionLabel={(opt) => `${opt.label} (${opt.date})`}
        onChange={(_, opt) => {
          if (!opt) return
          setPendingSavedNightId(opt.id)
        }}
        renderOption={(optionProps, opt) => (
          <Box component="li" {...optionProps} key={opt.id}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <HistoryIcon fontSize="small" color="action" />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={500}>
                  {opt.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {opt.date} • {playersSummary(opt.players)} • {opt.gameCount} games
                  {opt.description
                    ? ` • ${opt.description.slice(0, 40)}${opt.description.length > 40 ? '...' : ''}`
                    : ''}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Load a previous game night..."
            size="small"
            InputProps={{
              ...params.InputProps,
              startAdornment: <HistoryIcon fontSize="small" color="action" sx={{ ml: 1, mr: 0.5 }} />,
            }}
          />
        )}
      />

      <Dialog open={!!pendingNight} onClose={() => setPendingSavedNightId(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pr: 6 }}>
          Load saved game night?
          <IconButton
            aria-label="Close"
            onClick={() => setPendingSavedNightId(null)}
            sx={{ position: 'absolute', right: 8, top: 8, color: 'error.main' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {pendingNight ? (
            <Stack spacing={2}>
              <Stack spacing={1}>
                <Typography fontWeight={700}>{pendingNight.label}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Players: {pendingNight.players.join(', ')}
                </Typography>
                {pendingNight.organizerUsername ? (
                  <Typography variant="body2" color="text.secondary">
                    Host: {pendingNight.organizerUsername}
                  </Typography>
                ) : null}
                {pendingNight.description ? (
                  <Typography variant="body2" color="text.secondary">
                    {pendingNight.description}
                  </Typography>
                ) : null}
              </Stack>

              {/* Games loading option tile */}
              {pendingNight.gameCount > 0 ? (
                <Card
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    cursor: 'pointer',
                    bgcolor: includeGames ? 'primary.50' : 'background.paper',
                    borderColor: includeGames ? 'primary.main' : 'divider',
                    '&:hover': { borderColor: 'primary.main' },
                  }}
                  onClick={() => setIncludeGames((v) => !v)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Checkbox
                      checked={includeGames}
                      onChange={(e) => setIncludeGames(e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      size="small"
                      sx={{ p: 0, mt: 0.25 }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <SportsEsportsIcon fontSize="small" color="action" />
                        <Typography variant="body2" fontWeight={500}>
                          Load games from this night
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {pendingNight.gameCount} game{pendingNight.gameCount === 1 ? '' : 's'} will be added to your session
                      </Typography>
                    </Box>
                  </Box>
                </Card>
              ) : null}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingSavedNightId(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (!pendingNight) return
              await onLoadSavedNight(pendingNight.id, { includeGames })
              setPendingSavedNightId(null)
              setIncludeGames(true) // Reset for next use
              onAfterLoad?.()
            }}
          >
            Load
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
