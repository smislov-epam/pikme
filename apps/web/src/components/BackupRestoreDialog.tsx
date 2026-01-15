import { useRef, useState } from 'react'
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
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import { exportBackupZip, importBackup } from '../services/backup'
import { useToast } from '../services/toast'
import { colors } from '../theme/theme'
import { BggCollectionCsvImportPanel } from './bggCsv/BggCollectionCsvImportPanel'

export function BackupRestoreDialog(props: { open: boolean; onClose: () => void }) {
  const { open, onClose } = props
  const [status, setStatus] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [progress, setProgress] = useState<string>('')
  const [summary, setSummary] = useState<string>('')
  const [error, setError] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const toast = useToast()

  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const reset = () => {
    setStatus('idle')
    setProgress('')
    setSummary('')
    setError('')
    setPendingFile(null)
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


  const runImport = (mode: 'replace' | 'merge') => {
    if (!pendingFile) return
    setStatus('busy'); setError(''); setSummary('')
    void importBackup({
      files: pendingFile,
      mode,
      onProgress: (p) => setProgress(`${p.message}${p.table ? ` (${p.table})` : ''}`),
    })
      .then((res) => {
        setStatus('done')
        setProgress('')
        setSummary(`Import ${res.mode} complete at ${new Date().toLocaleString()}`)
        toast.success('Backup imported')
        setTimeout(() => window.location.reload(), 400)
      })
      .catch((err) => {
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Import failed')
        toast.error('Import failed')
      })
  }

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

        {pendingFile ? (
          <>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                px: 1.25,
                py: 1,
                bgcolor: 'background.default',
              }}
            >
              <InsertDriveFileIcon fontSize="small" color="action" />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {pendingFile.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {backupDateLabelFromFileName(pendingFile.name)} • {formatBytes(pendingFile.size)}
                </Typography>
              </Box>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Box sx={{ flex: 1, border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
                <Button
                  fullWidth
                  variant="contained"
                  color="warning"
                  disabled={status === 'busy'}
                  onClick={() => runImport('replace')}
                >
                  Replace
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                  Clears local data, then imports from the backup.
                </Typography>
              </Box>

              <Box sx={{ flex: 1, border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
                <Button fullWidth variant="contained" disabled={status === 'busy'} onClick={() => runImport('merge')}>
                  Merge
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                  Keeps existing data; updates/creates records using latest timestamps.
                </Typography>
              </Box>
            </Stack>
          </>
        ) : null}

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

function backupDateLabelFromFileName(fileName: string): string {
  const stamp = extractBackupStamp(fileName)
  if (!stamp) return 'Selected backup'
  return `Backup date: ${formatStampAsDateTime(stamp)}`
}

function extractBackupStamp(fileName: string): string | null {
  const m = fileName.match(/(\d{12})/)
  return m ? m[1] : null
}

function formatStampAsDateTime(stamp: string): string {
  const yyyy = stamp.slice(0, 4)
  const mm = stamp.slice(4, 6)
  const dd = stamp.slice(6, 8)
  const hh = stamp.slice(8, 10)
  const min = stamp.slice(10, 12)
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return ''
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(1)} MB`
  const gb = mb / 1024
  return `${gb.toFixed(1)} GB`
}
