import { useState } from 'react'

export function useWizardDialogsState() {
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [showHelpDialog, setShowHelpDialog] = useState(false)
  const [showBackupDialog, setShowBackupDialog] = useState(false)
  const [showSessionDialog, setShowSessionDialog] = useState(false)
  const [showSessionInviteDialog, setShowSessionInviteDialog] = useState(false)
  const [forceCreateNewSession, setForceCreateNewSession] = useState(false)

  return {
    showApiKeyDialog,
    setShowApiKeyDialog,
    showSaveDialog,
    setShowSaveDialog,
    showClearDialog,
    setShowClearDialog,
    showHelpDialog,
    setShowHelpDialog,
    showBackupDialog,
    setShowBackupDialog,
    showSessionDialog,
    setShowSessionDialog,
    showSessionInviteDialog,
    setShowSessionInviteDialog,
    forceCreateNewSession,
    setForceCreateNewSession,
  }
}
