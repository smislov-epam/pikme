import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import AddIcon from '@mui/icons-material/Add'
import { colors } from '../../theme/theme'
import type { GameNoteRecord } from '../../db/types'
import * as notesService from '../../services/db/gameNotesService'

function formatNoteTime(iso: string): string {
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return iso
  return dt.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function GameNotesPanel(props: {
  bggId: number
  height?: number | string
}) {
  const { bggId, height = 250 } = props

  const theme = useTheme()
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'))

  const [notes, setNotes] = useState<GameNoteRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState('')

  const canAdd = useMemo(() => draft.trim().length > 0 && !saving, [draft, saving])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const list = await notesService.listGameNotes(bggId)
      setNotes(list)
    } finally {
      setLoading(false)
    }
  }, [bggId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handleAdd = useCallback(async () => {
    if (!draft.trim()) return
    setSaving(true)
    try {
      await notesService.addGameNote(bggId, draft)
      setDraft('')
      await refresh()
    } finally {
      setSaving(false)
    }
  }, [bggId, draft, refresh])

  const handleDelete = useCallback(async (id: number) => {
    await notesService.deleteGameNote(id)
    await refresh()
  }, [refresh])

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
        p: 1.5,
        height,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="subtitle2" fontWeight={700}>
          Notes
        </Typography>
        <Box
          sx={{
            minWidth: 26,
            height: 26,
            borderRadius: '50%',
            bgcolor: colors.oceanBlue,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
        >
          {notes.length}
        </Box>
      </Stack>

      <TextField
        size="small"
        placeholder="Add a note…"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            void handleAdd()
          }
        }}
        multiline
        minRows={2}
        fullWidth
        helperText={isPhone ? undefined : 'Tip: Ctrl+Enter to add quickly.'}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end" sx={{ alignSelf: 'flex-start', mt: 0.5 }}>
              <Button
                variant="contained"
                size="small"
                startIcon={saving ? <CircularProgress size={16} /> : <AddIcon />}
                onClick={() => void handleAdd()}
                disabled={!canAdd}
                sx={{ height: 32, whiteSpace: 'nowrap' }}
              >
                Add
              </Button>
            </InputAdornment>
          ),
        }}
      />

      <Box sx={{ flex: 1, overflow: 'auto', pr: 0.5 }}>
        {loading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
            <CircularProgress size={20} />
          </Stack>
        ) : notes.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            No notes yet.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {notes.map((n) => (
              <Box
                key={n.id}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 1,
                }}
              >
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                  <Typography variant="caption" color="text.secondary">
                    {formatNoteTime(n.createdAt)}
                  </Typography>
                  {typeof n.id === 'number' ? (
                    <IconButton
                      size="small"
                      aria-label="Delete note"
                      onClick={() => void handleDelete(n.id as number)}
                      sx={{ width: 32, height: 32, color: 'error.main' }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  ) : null}
                </Stack>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {n.text}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
      </Box>

    </Box>
  )
}
