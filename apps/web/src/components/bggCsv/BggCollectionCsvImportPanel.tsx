import { useEffect, useRef, useState } from 'react'
import { Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd'
import DownloadIcon from '@mui/icons-material/Download'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import type { UserRecord } from '../../db/types'
import * as dbService from '../../services/db'
import { importBggCollectionCsv, parseBggCollectionCsv } from '../../services/bggCsv'
import { useToast } from '../../services/toast'
import { readBlobText } from '../../services/bggCsv/readBlobText'
import { buildBggCsvPreflightText } from './bggCsvPreflightText'

export function BggCollectionCsvImportPanel(props: {
  disabled: boolean
  onBusyStart: () => void
  onBusyEnd: () => void
  onProgress: (message: string) => void
  onSummary: (message: string) => void
  onError: (message: string) => void
  formatBytes: (bytes: number) => string
}) {
  const { disabled, onBusyStart, onBusyEnd, onProgress, onSummary, onError, formatBytes } = props
  const toast = useToast()

  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [users, setUsers] = useState<UserRecord[]>([])
  const [username, setUsername] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [preflightText, setPreflightText] = useState<string>('')
  const [candidates, setCandidates] = useState<number>(0)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const organizer = await dbService.getOrganizer()
        const allUsers = await dbService.getAllUsers()
        if (cancelled) return

        setUsers(allUsers)
        setUsername((u) => u || organizer?.username || allUsers[0]?.username || '')
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const canSelectUser = users.length > 0
  const canImport = Boolean(username.trim())
  const summaryLabel = pendingFile
    ? (candidates > 0 ? `Show ${candidates} games from collection` : 'BGG collection CSV selected')
    : ''

  const handleSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const f = files[0] ?? null
    if (!f) return

    setPendingFile(f)
    setPreflightText('')
    setCandidates(0)

    void readBlobText(f)
      .then((content) => {
        const pre = parseBggCollectionCsv(content)
        setCandidates(pre.stats.importedCandidates)

        setPreflightText(buildBggCsvPreflightText(f.name, pre))
      })
      .catch((err) => onError(err instanceof Error ? err.message : 'Invalid BGG CSV'))
  }

  const runImport = () => {
    if (!pendingFile) return
    const u = username.trim()
    if (!u) {
      onError('Choose a user to import ownership into.')
      return
    }

    onBusyStart()
    onError('')
    onSummary('')

    void importBggCollectionCsv({
      file: pendingFile,
      username: u,
      onProgress: (m) => onProgress(m),
    })
      .then((res) => {
        onProgress('')
        onSummary(
          [
            `Imported BGG collection CSV for ${res.username}.`,
            `Imported games: ${res.imported}`,
            `Skipped (not owned): ${res.skippedNotOwned}`,
            `Skipped (expansions): ${res.skippedExpansions}`,
            res.errors.length ? `Row errors: ${res.errors.length} (see preflight)` : 'Row errors: 0',
            `Completed at ${new Date().toLocaleString()}`,
          ].join('\n'),
        )
        toast.success('BGG CSV imported')
        setTimeout(() => window.location.reload(), 400)
      })
      .catch((err) => {
        onError(err instanceof Error ? err.message : 'BGG CSV import failed')
        toast.error('BGG CSV import failed')
      })
      .finally(() => {
        onBusyEnd()
      })
  }

  return (
    <Box sx={isOpen ? { border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' } : undefined}>
      <Button
        size="small"
        variant="contained"
        color={isOpen ? 'primary' : 'warning'}
        disabled={disabled}
        onClick={() => setIsOpen((v) => !v)}
        fullWidth
        sx={{
          justifyContent: 'space-between',
          px: 1.25,
          borderRadius: 0,
          ...(isOpen
            ? {
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
              }
            : {
                borderRadius: 12,
              }),
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <PlaylistAddIcon fontSize="small" />
          <Typography variant="body2" fontWeight={700} noWrap>
            Import BGG collection CSV
          </Typography>
        </Box>
        <ExpandMoreIcon
          sx={{
            transition: 'transform 160ms ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </Button>

      {isOpen ? (
        <Box sx={{ p: 1.25 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            sx={{ mt: 1.25 }}
          >
            {canSelectUser ? (
              <TextField
                select
                label="Import for user"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                size="small"
                sx={{ minWidth: { sm: 240 } }}
                disabled={disabled}
              >
                {users.map((u) => (
                  <MenuItem key={u.username} value={u.username}>
                    {u.displayName ? `${u.displayName} (${u.username})` : u.username}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <TextField
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                size="small"
                placeholder="BGG username or local player key"
                disabled={disabled}
              />
            )}

            <Button
              size="small"
              startIcon={<DownloadIcon />}
              variant="outlined"
              disabled={disabled || !canImport}
              onClick={() => inputRef.current?.click()}
            >
              Choose CSV
            </Button>
            <input
              ref={(node) => {
                inputRef.current = node
              }}
              type="file"
              accept=".csv"
              aria-label="BGG collection CSV"
              hidden
              onChange={(e) => {
                handleSelect(e.target.files)
                e.currentTarget.value = ''
              }}
            />
          </Stack>

          {summaryLabel ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
              {summaryLabel}
            </Typography>
          ) : null}

          {pendingFile ? (
            <Box sx={{ mt: 1.25, display: 'flex', alignItems: 'center', gap: 1 }}>
              <InsertDriveFileIcon fontSize="small" color="action" />
              <Typography variant="body2" fontWeight={600} noWrap>
                {pendingFile.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {formatBytes(pendingFile.size)}
              </Typography>
            </Box>
          ) : null}

          {preflightText ? (
            <TextField
              value={preflightText}
              multiline
              minRows={3}
              fullWidth
              label="Preflight"
              InputProps={{ readOnly: true }}
              sx={{ mt: 1.25 }}
            />
          ) : null}

          <Box sx={{ mt: 1.25 }}>
            <Button variant="contained" disabled={disabled || !pendingFile || !canImport} onClick={runImport}>
              Apply import
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
              No network calls. Images/details can be filled later via “Refresh from BGG”.
            </Typography>
          </Box>
        </Box>
      ) : null}
    </Box>
  )
}
