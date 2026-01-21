import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { WizardHeader } from '../../../pages/wizard/WizardHeader'
import { BggApiKeyDialog } from '../../BggApiKeyDialog'
import { HelpWalkthroughDialog } from '../../HelpWalkthroughDialog'
import { BackupRestoreDialog } from '../../BackupRestoreDialog'
import { ClearAllDataDialog } from '../../../pages/wizard/ClearAllDataDialog'
import { clearAllData } from '../../../db/db'
import { useActiveSessions } from '../../../hooks/useActiveSessions'

export function SessionJoinPageHeader() {
  const { sessions } = useActiveSessions()
  const navigate = useNavigate()

  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false)
  const [showHelpDialog, setShowHelpDialog] = useState(false)
  const [showBackupDialog, setShowBackupDialog] = useState(false)
  const [showClearDialog, setShowClearDialog] = useState(false)

  const handleClearAllData = async () => {
    await clearAllData()
    setShowClearDialog(false)
    window.location.reload()
  }

  return (
    <>
      <WizardHeader
        variant="auto"
        onOpenClearDialog={() => setShowClearDialog(true)}
        onOpenBackup={() => setShowBackupDialog(true)}
        onOpenSettings={() => setShowApiKeyDialog(true)}
        onOpenHelp={() => setShowHelpDialog(true)}
        activeSessionCount={sessions.length}
        onOpenSessions={() => {
          navigate('/sessions')
        }}
      />

      <BggApiKeyDialog
        open={showApiKeyDialog}
        onClose={() => setShowApiKeyDialog(false)}
        onKeySaved={() => setShowApiKeyDialog(false)}
      />
      <HelpWalkthroughDialog open={showHelpDialog} onClose={() => setShowHelpDialog(false)} />
      <BackupRestoreDialog open={showBackupDialog} onClose={() => setShowBackupDialog(false)} />
      <ClearAllDataDialog
        open={showClearDialog}
        onClose={() => setShowClearDialog(false)}
        onConfirm={handleClearAllData}
      />
    </>
  )
}
