import { useState } from 'react'
import { Box, Button, IconButton, Stack, Typography } from '@mui/material'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import CloseIcon from '@mui/icons-material/Close'
import type { BackupUserInfo, UserMapping } from '../../services/backup'
import type { UserRecord } from '../../db/types'
import { backupDateLabelFromFileName, formatBytes } from './backupUtils'
import { UserMappingPanel } from './UserMappingPanel'

interface ImportOptionsPanelProps {
  file: File
  backupUsers: BackupUserInfo[]
  localUsers: UserRecord[]
  currentUsername: string | undefined
  disabled: boolean
  onImport: (mode: 'replace' | 'merge', mapping: UserMapping) => void
}

type ViewMode = 'select' | 'replace-mapping' | 'merge-mapping'

export function ImportOptionsPanel(props: ImportOptionsPanelProps) {
  const { file, backupUsers, localUsers, currentUsername, disabled, onImport } = props

  const [viewMode, setViewMode] = useState<ViewMode>('select')
  const [replaceMapping, setReplaceMapping] = useState<UserMapping>({})
  const [mergeMapping, setMergeMapping] = useState<UserMapping>({})

  const usersWithData = backupUsers.filter((u) => u.gameCount > 0 || u.preferenceCount > 0)
  const canShowReplaceMapping = usersWithData.length > 0 && currentUsername
  const canShowMergeMapping = usersWithData.length > 0 && localUsers.length > 0

  const handleReplaceClick = () => {
    if (canShowReplaceMapping) {
      setViewMode('replace-mapping')
    } else {
      onImport('replace', {})
    }
  }

  const handleMergeClick = () => {
    if (canShowMergeMapping) {
      setViewMode('merge-mapping')
    } else {
      onImport('merge', {})
    }
  }

  return (
    <>
      {/* File info tile - always visible */}
      <FileInfoTile file={file} backupUsers={backupUsers} />

      {viewMode === 'select' && (
        <SelectModeView disabled={disabled} onReplaceClick={handleReplaceClick} onMergeClick={handleMergeClick} />
      )}

      {viewMode === 'replace-mapping' && currentUsername && (
        <MappingView
          title="Identity Mapping"
          description="Select which backup user represents you"
          onClose={() => setViewMode('select')}
          onConfirm={() => onImport('replace', replaceMapping)}
          confirmLabel="Replace"
          confirmColor="warning"
          disabled={disabled}
        >
          <UserMappingPanel
            mode="replace"
            backupUsers={usersWithData}
            localUsers={localUsers}
            mapping={replaceMapping}
            onMappingChange={setReplaceMapping}
            currentUsername={currentUsername}
          />
        </MappingView>
      )}

      {viewMode === 'merge-mapping' && (
        <MappingView
          title="User Mapping"
          description="Map backup users to local users (optional)"
          onClose={() => setViewMode('select')}
          onConfirm={() => onImport('merge', mergeMapping)}
          confirmLabel="Merge"
          confirmColor="primary"
          disabled={disabled}
        >
          <UserMappingPanel
            mode="merge"
            backupUsers={usersWithData}
            localUsers={localUsers}
            mapping={mergeMapping}
            onMappingChange={setMergeMapping}
          />
        </MappingView>
      )}
    </>
  )
}

function FileInfoTile({ file, backupUsers }: { file: File; backupUsers: BackupUserInfo[] }) {
  return (
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
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {file.name}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {backupDateLabelFromFileName(file.name)} • {formatBytes(file.size)}
          {backupUsers.length > 0 && ` • ${backupUsers.length} user(s)`}
        </Typography>
      </Box>
    </Box>
  )
}

function SelectModeView({
  disabled,
  onReplaceClick,
  onMergeClick,
}: {
  disabled: boolean
  onReplaceClick: () => void
  onMergeClick: () => void
}) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <Box sx={{ flex: 1, border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
        <Button fullWidth variant="contained" color="warning" disabled={disabled} onClick={onReplaceClick}>
          Replace
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
          Clears local data, then imports from the backup.
        </Typography>
      </Box>

      <Box sx={{ flex: 1, border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
        <Button fullWidth variant="contained" disabled={disabled} onClick={onMergeClick}>
          Merge
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
          Keeps existing data; updates/creates records using latest timestamps.
        </Typography>
      </Box>
    </Stack>
  )
}

function MappingView({
  title,
  description,
  onClose,
  onConfirm,
  confirmLabel,
  confirmColor,
  disabled,
  children,
}: {
  title: string
  description: string
  onClose: () => void
  onConfirm: () => void
  confirmLabel: string
  confirmColor: 'primary' | 'warning'
  disabled: boolean
  children: React.ReactNode
}) {
  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      {/* Header with close button */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'action.hover',
        }}
      >
        <Box>
          <Typography variant="subtitle2">{title}</Typography>
          <Typography variant="caption" color="text.secondary">
            {description}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Back to options">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Mapping content - bounded with scroll */}
      <Box sx={{ p: 1.5, maxHeight: 200, overflowY: 'auto' }}>{children}</Box>

      {/* Confirm button */}
      <Box sx={{ px: 1.5, pb: 1.5 }}>
        <Button fullWidth variant="contained" color={confirmColor} disabled={disabled} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </Box>
    </Box>
  )
}
