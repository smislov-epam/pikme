import { useEffect, useRef, useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import ArchiveIcon from '@mui/icons-material/Archive'
import UploadIcon from '@mui/icons-material/Upload'
import DownloadIcon from '@mui/icons-material/Download'
import { exportBackupZip, importBackup, previewBackup } from '../services/backup'
import type { BackupUserInfo, UserMapping } from '../services/backup'
import { useToast } from '../services/toast'
import { colors } from '../theme/theme'
import { BggCollectionCsvImportPanel } from './bggCsv/BggCollectionCsvImportPanel'
import { ImportOptionsPanel } from './backup/ImportOptionsPanel'
import { formatBytes } from './backup/backupUtils'
import { db } from '../db'
import type { UserRecord } from '../db/types'
import { useLocalOwner } from '../hooks/useLocalOwner'

export function BackupRestoreDialog(props: { open: boolean; onClose: () => void }) {
  const { open, onClose } = props
  const [status, setStatus] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [progress, setProgress] = useState<string>('')
  const [summary, setSummary] = useState<string>('')
  const [error, setError] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const toast = useToast()
  const { localOwner } = useLocalOwner()

  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [backupUsers, setBackupUsers] = useState<BackupUserInfo[]>([])
  const [localUsers, setLocalUsers] = useState<UserRecord[]>([])

  // Load local users when dialog opens
  useEffect(() => {
    if (open) {
      db.users.toArray().then(setLocalUsers).catch(console.error)
    }
  }, [open])

  // Preview backup when file is selected
  useEffect(() => {
    if (!pendingFile) return
    
    let cancelled = false
    previewBackup(pendingFile)
      .then((preview) => {
        if (cancelled) return
        setBackupUsers(preview.users)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to preview backup')
      })
    
    return () => { cancelled = true }
  }, [pendingFile])

  const reset = () => {
    setStatus('idle')
    setProgress('')
    setSummary('')
    setError('')
    setPendingFile(null)
    setBackupUsers([])
  }

  const handleClose = () => {
    if (status === 'busy') return
    reset()
    onClose()
  }

  const handleExport = async () => {
    setStatus('busy'); setProgress('Preparing backup...'); setError('')
    try {
      const result = await exportBackupZip((p) => setProgress(`${p.message}`))
      const url = URL.createObjectURL(result.blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result.fileName
      a.click()
      URL.revokeObjectURL(url)
      setStatus('done')
      setProgress('')
      setSummary(`Backup exported (${result.metadata.counts.games ?? 0} games) at ${new Date().toLocaleString()}`)
      toast.success('Backup exported')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Export failed')
      toast.error('Export failed')
    }
  }

  const handleImport = (files: FileList | null) => {
    if (!files || files.length === 0) return
    setPendingFile(files[0] ?? null)
    setError('')
    setSummary('')
  }


  const runImport = (mode: 'replace' | 'merge', mapping: UserMapping) => {
    if (!pendingFile) return
    setStatus('busy'); setError(''); setSummary('')
    
    // For replace mode with mapping, the target username should become the local owner
    const localOwnerUsername = mode === 'replace' && Object.keys(mapping).length > 0
      ? Object.values(mapping)[0]  // The target username (current user)
      : undefined
    
    void importBackup({
      files: pendingFile,
      mode,
      userMapping: Object.keys(mapping).length > 0 ? mapping : undefined,
      localOwnerUsername,
      onProgress: (p) => setProgress(`${p.message}${p.table ? ` (${p.table})` : ''}`),
    })
      .then((res) => {
        setStatus('done')
        setProgress('')
        const mappingInfo = Object.keys(mapping).length > 0 
          ? ` (${Object.keys(mapping).length} user mapping applied)` 
          : ''
        setSummary(`Import ${res.mode} complete${mappingInfo} at ${new Date().toLocaleString()}`)
        toast.success('Backup imported')
        setTimeout(() => window.location.reload(), 400)
      })
      .catch((err) => {
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Import failed')
        toast.error('Import failed')
      })
  }

  const currentUsername = localOwner?.username

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          m: 0,
          px: 2.5,
          py: 1.75,
          bgcolor: colors.oceanBlue,
          color: 'white',
          borderBottom: 'none',
          borderTopLeftRadius: (theme) => theme.shape.borderRadius,
          borderTopRightRadius: (theme) => theme.shape.borderRadius,
          overflow: 'hidden',
        }}
      >
        <ArchiveIcon fontSize="small" /> Backup & Restore
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 3.5 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
          <Button variant="contained" startIcon={<UploadIcon />} onClick={handleExport} disabled={status === 'busy'}>
            Export backup (.zip)
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            disabled={status === 'busy'}
            onClick={() => fileInputRef.current?.click()}
          >
            Choose backup
          </Button>
          <input
            ref={(node) => {
              fileInputRef.current = node
            }}
            type="file"
            accept=".zip"
            aria-label="Backup file"
            hidden
            onChange={(e) => {
              handleImport(e.target.files)
              e.currentTarget.value = ''
            }}
          />
        </Stack>

        {pendingFile && (
          <ImportOptionsPanel
            file={pendingFile}
            backupUsers={backupUsers}
            localUsers={localUsers}
            currentUsername={currentUsername}
            disabled={status === 'busy'}
            onImport={runImport}
          />
        )}

        <Divider />

        <BggCollectionCsvImportPanel
          disabled={status === 'busy'}
          onBusyStart={() => setStatus('busy')}
          onBusyEnd={() => setStatus('idle')}
          onProgress={(m) => setProgress(m)}
          onSummary={(m) => setSummary(m)}
          onError={(m) => setError(m)}
          formatBytes={formatBytes}
        />

        {progress ? (
          <Box>
            <LinearProgress sx={{ mb: 1 }} />
            <Typography variant="body2" color="text.secondary">{progress}</Typography>
          </Box>
        ) : null}

        {summary ? <TextField value={summary} multiline minRows={2} fullWidth label="Summary" InputProps={{ readOnly: true }} /> : null}
        {error ? <TextField value={error} multiline minRows={2} fullWidth label="Errors" color="error" InputProps={{ readOnly: true }} /> : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={status === 'busy'}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
