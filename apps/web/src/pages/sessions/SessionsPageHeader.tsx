import { useState } from 'react'
import { WizardHeader } from '../wizard/WizardHeader'
import { BggApiKeyDialog } from '../../components/BggApiKeyDialog'
import { HelpWalkthroughDialog } from '../../components/HelpWalkthroughDialog'
import { BackupRestoreDialog } from '../../components/BackupRestoreDialog'
import { ClearAllDataDialog } from '../wizard/ClearAllDataDialog'
import { clearAllData } from '../../db/db'
import { useAuth } from '../../hooks/useAuth'

export function SessionsPageHeader(props: {
  activeSessionCount: number
  onOpenSessions?: () => void
}) {
  const { activeSessionCount, onOpenSessions } = props

  const { user, firebaseReady } = useAuth()
  const isRegisteredUser = firebaseReady && user !== null

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
        variant={isRegisteredUser ? 'blue' : 'auto'}
        onOpenClearDialog={() => setShowClearDialog(true)}
        onOpenBackup={() => setShowBackupDialog(true)}
        onOpenSettings={() => setShowApiKeyDialog(true)}
        onOpenHelp={() => setShowHelpDialog(true)}
        activeSessionCount={activeSessionCount}
        onOpenSessions={onOpenSessions}
      />

      <BggApiKeyDialog
        open={showApiKeyDialog}
        onClose={() => setShowApiKeyDialog(false)}
        onKeySaved={() => setShowApiKeyDialog(false)}
      />
      <HelpWalkthroughDialog
        open={showHelpDialog}
        onClose={() => setShowHelpDialog(false)}
      />
      <BackupRestoreDialog
        open={showBackupDialog}
        onClose={() => setShowBackupDialog(false)}
      />
      <ClearAllDataDialog
        open={showClearDialog}
        onClose={() => setShowClearDialog(false)}
        onConfirm={handleClearAllData}
      />
    </>
  )
}
