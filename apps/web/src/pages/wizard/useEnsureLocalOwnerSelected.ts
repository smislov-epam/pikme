import { useEffect } from 'react'
import type { WizardActions, WizardState } from '../../hooks/useWizardState'
import { getLocalOwner } from '../../services/db/localOwnerService'
import { getWizardActiveSessionId } from '../../services/storage/wizardStateStorage'

export function useEnsureLocalOwnerSelected(wizard: WizardState & WizardActions) {
  const usersLength = wizard.users.length
  const addLocalUser = wizard.addLocalUser

  useEffect(() => {
    if (usersLength > 0) return

    // Skip auto-adding local owner when there's an active session.
    // The session switching hook (useWizardSessionSwitching) will load users
    // from the session snapshot. Adding the local owner here would race with
    // that load and potentially overwrite session preferences with Dexie data.
    const activeSessionId = getWizardActiveSessionId()
    if (activeSessionId) return

    void (async () => {
      try {
        const owner = await getLocalOwner()
        if (owner) {
          await addLocalUser(owner.username)
        }
      } catch {
        // ignore
      }
    })()
  }, [usersLength, addLocalUser])
}
