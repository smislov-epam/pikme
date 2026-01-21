import { useCallback, useEffect, useMemo, useState } from 'react'
import { Stack } from '@mui/material'
import { PlayersStep, FiltersStep, PreferencesStep, ResultStep } from '../../components/steps'
import type { WizardState, WizardActions } from '../../hooks/useWizardState'
import type { UserRecord, UserPreferenceRecord } from '../../db/types'
import type { GuestStatus, UserSyncStatus } from '../../components/steps/preferences/types'
import type { SharedGamePreference } from '../../services/session/types'
import { useToast } from '../../services/toast'

/** Create a hash of preferences for comparison */
function hashPreferences(prefs: UserPreferenceRecord[], filteredBggIds: Set<number>): string {
  const filtered = prefs
    .filter((p) => filteredBggIds.has(p.bggId))
    .map((p) => `${p.bggId}:${p.rank ?? ''}:${p.isTopPick ? 'T' : ''}:${p.isDisliked ? 'D' : ''}`)
    .sort()
  return filtered.join('|')
}

/** Convert local preferences to shared format */
function toSharedPreferences(
  prefs: UserPreferenceRecord[],
  filteredBggIds: Set<number>
): SharedGamePreference[] {
  return prefs
    .filter((p) => filteredBggIds.has(p.bggId))
    .map((p) => ({
      bggId: p.bggId,
      rank: p.rank,
      isTopPick: p.isTopPick,
      isDisliked: p.isDisliked,
    }))
}

export function WizardStepContent(props: {
  activeStep: number
  wizard: WizardState & WizardActions
  onOpenSaveDialog: () => void
  /** Optional merged users (includes session guests) */
  mergedUsers?: UserRecord[]
  /** Optional merged preferences (includes session guest preferences) */
  mergedPreferences?: Record<string, UserPreferenceRecord[]>
  /** Optional guest statuses (for showing ready indicators on host) */
  guestStatuses?: GuestStatus[]
  /** Session guest mode - session ID if guest joined with local games, null otherwise */
  sessionGuestMode?: string | null
  /** Steps with disabled controls (viewable but not editable) */
  disabledSteps?: number[]
  /** Active session ID (for hosts to see other participants) */
  activeSessionId?: string | null
}) {
  const { activeStep, wizard, onOpenSaveDialog, mergedUsers, mergedPreferences, guestStatuses, sessionGuestMode, disabledSteps = [], activeSessionId } = props

  // Use merged data if provided, otherwise use wizard data
  const usersForPrefs = mergedUsers ?? wizard.users
  const preferencesForPrefs = mergedPreferences ?? wizard.preferences

  // Compute read-only usernames:
  // - For hosts: session guests (usernames starting with __guest_) are read-only
  // - For guests in sessionGuestMode: all users EXCEPT the local owner are read-only
  const readOnlyUsernames = useMemo(() => {
    if (sessionGuestMode) {
      // Guest mode: only the local owner can edit their preferences
      // All other users are read-only
      return usersForPrefs
        .filter((u) => !u.isLocalOwner)
        .map((u) => u.username)
    }
    // Host mode: session guests are read-only
    return usersForPrefs
      .filter((u) => u.username.startsWith('__guest_'))
      .map((u) => u.username)
  }, [usersForPrefs, sessionGuestMode])

  const toast = useToast()

  // Track synced preferences hash per user (for detecting changes since sync)
  const [syncedPrefsMap, setSyncedPrefsMap] = useState<Record<string, string>>({})
  
  // Track which user is currently syncing
  const [syncingUsername, setSyncingUsername] = useState<string | null>(null)

  // Session-scoped: when switching sessions, default local users to “needs sync”
  // until a sync completes for the new session.
  useEffect(() => {
    setSyncedPrefsMap({})
    setSyncingUsername(null)
  }, [activeSessionId])

  // Build set of filtered game BGG IDs
  const filteredGameBggIds = useMemo(
    () => new Set(wizard.filteredGames.map((g) => g.bggId)),
    [wizard.filteredGames]
  )

  // Once an online session exists, preferences should be syncable so invitees can see them.
  const syncStatuses = useMemo<UserSyncStatus[]>(() => {
    // Only compute sync statuses if we have an online session
    if (!activeSessionId) return []

    return usersForPrefs.map((user) => {
      const isGuest = user.username.startsWith('__guest_')
      const userPrefs = preferencesForPrefs[user.username] ?? []

      if (isGuest) {
        // Remote guest - check if they have preferences
        const guestStatus = guestStatuses?.find((g) => g.username === user.username)
        const hasUpdates = (guestStatus?.updatedAt ?? null) !== null
        return {
          username: user.username,
          state: hasUpdates ? 'remote' : 'waiting',
          lastSyncedAt: guestStatus?.updatedAt ?? null,
          lastSyncedPrefsHash: null,
        } as UserSyncStatus
      }

      // Local user - check if synced or needs sync
      const currentHash = hashPreferences(userPrefs, filteredGameBggIds)
      const syncedHash = syncedPrefsMap[user.username]

      if (syncedHash === currentHash) {
        return {
          username: user.username,
          state: 'synced',
          lastSyncedAt: Date.now(),
          lastSyncedPrefsHash: syncedHash,
        } as UserSyncStatus
      }

      // Not synced or changed since sync
      return {
        username: user.username,
        state: 'needs-sync',
        lastSyncedAt: null,
        lastSyncedPrefsHash: syncedHash ?? null,
      } as UserSyncStatus
    }).map((status) => {
      // Override state if this user is currently syncing
      if (status.username === syncingUsername) {
        return { ...status, state: 'syncing' as const }
      }
      return status
    })
  }, [activeSessionId, usersForPrefs, preferencesForPrefs, guestStatuses, syncedPrefsMap, filteredGameBggIds, syncingUsername])

  // Handle sync for a local user.
  const handleSyncUser = useCallback(async (username: string) => {
    if (!activeSessionId) return
    
    // Set syncing state
    setSyncingUsername(username)

    const userPrefs = preferencesForPrefs[username] ?? []
    const sharedPrefs = toSharedPreferences(userPrefs, filteredGameBggIds)
    
    // Find the user to get their display name
    const user = usersForPrefs.find((u) => u.username === username)
    const displayName = user?.displayName || username
    
    // Determine user type:
    // - Session guests: prefixed with __guest_
    // - Local owner (host): the device owner syncing their own preferences
    // - Other local users: added by host, need forLocalUser parameter
    const isSessionGuest = username.startsWith('__guest_')
    const isLocalOwner = user?.isLocalOwner === true

    try {
      const { submitGuestPreferences } = await import('../../services/session')
      
      if (isSessionGuest || isLocalOwner) {
        // Session guests and local owner (host) sync as themselves (no forLocalUser)
        // This ensures host preferences use consistent doc ID: just uid
        await submitGuestPreferences(activeSessionId, sharedPrefs)
      } else {
        // Other local users: host submits on their behalf with username as participantId
        // This creates doc ID: uid_username to distinguish from host's own preferences
        await submitGuestPreferences(activeSessionId, sharedPrefs, {
          participantId: username,
          displayName,
        })
      }

      // Update synced hash
      const newHash = hashPreferences(userPrefs, filteredGameBggIds)
      setSyncedPrefsMap((prev) => ({ ...prev, [username]: newHash }))

      toast.success(`${displayName}'s preferences synced`)
    } catch (err) {
      console.error('[WizardStepContent] Failed to sync:', err)
      toast.error('Failed to sync preferences')
    } finally {
      // Clear syncing state
      setSyncingUsername(null)
    }
  }, [activeSessionId, preferencesForPrefs, filteredGameBggIds, usersForPrefs, toast])

  switch (activeStep) {
    case 0:
      return (
        <PlayersStep
          users={wizard.users}
          games={wizard.games}
          sessionGames={wizard.sessionGames}
          gameOwners={wizard.gameOwners}
          layoutMode={wizard.layoutMode}
          onLayoutModeChange={wizard.setLayoutMode}
          existingLocalUsers={wizard.existingLocalUsers}
          onSetExistingLocalUsers={wizard.setExistingLocalUsers}
          savedNights={wizard.savedNights}
          pendingBggUserNotFoundUsername={wizard.pendingBggUserNotFoundUsername}
          onConfirmAddBggUserAnyway={wizard.confirmAddBggUserAnyway}
          onCancelAddBggUserAnyway={wizard.cancelAddBggUserAnyway}
          onAddBggUser={wizard.addBggUser}
          onAddLocalUser={wizard.addLocalUser}
          onRemoveUser={wizard.removeUser}
          onDeleteUser={wizard.deleteUserPermanently}
          onSetOrganizer={wizard.setOrganizer}
          onSearchGame={wizard.searchGame}
          onAddGameToUser={wizard.addGameToUser}
          onRemoveGameFromUser={wizard.removeGameFromUser}
          onAddGameToSession={wizard.addGameToSession}
          onRemoveGameFromSession={wizard.removeGameFromSession}
          onAddOwnerToGame={wizard.addOwnerToGame}
          onLoadSavedNight={wizard.loadSavedNight}
          onFetchGameInfo={wizard.fetchGameInfo}
          onAddGameManually={wizard.addGameManually}
          onEditGame={wizard.updateGame}
          onRefreshGameFromBgg={wizard.refreshGameFromBgg}
          isLoading={wizard.isLoadingUser}
        />
      )
    case 1:
      return (
        <FiltersStep
          games={wizard.sessionGames}
          users={wizard.users}
          gameOwners={wizard.gameOwners}
          sessionUserCount={wizard.users.length}
          layoutMode={wizard.layoutMode}
          onLayoutModeChange={wizard.setLayoutMode}
          playerCount={wizard.filters.playerCount}
          onPlayerCountChange={wizard.setPlayerCount}
          timeRange={wizard.filters.timeRange}
          onTimeRangeChange={wizard.setTimeRange}
          mode={wizard.filters.mode}
          onModeChange={wizard.setMode}
          requireBestWithPlayerCount={wizard.filters.requireBestWithPlayerCount}
          onRequireBestWithPlayerCountChange={wizard.setRequireBestWithPlayerCount}
          excludeLowRatedThreshold={wizard.filters.excludeLowRatedThreshold}
          onExcludeLowRatedChange={wizard.setExcludeLowRated}
          ageRange={wizard.filters.ageRange}
          onAgeRangeChange={wizard.setAgeRange}
          complexityRange={wizard.filters.complexityRange}
          onComplexityRangeChange={wizard.setComplexityRange}
          ratingRange={wizard.filters.ratingRange}
          onRatingRangeChange={wizard.setRatingRange}
          filteredGames={wizard.filteredGames}
          onExcludeGameFromSession={wizard.excludeGameFromSession}
          onUndoExcludeGameFromSession={wizard.undoExcludeGameFromSession}
          disabled={disabledSteps.includes(1)}
        />
      )
    case 2: {
      // Show sync UI whenever there is an online session so invitees can see preferences.
      const showSyncUI = Boolean(activeSessionId)
      return (
        <Stack spacing={3}>
          <PreferencesStep
            // Remount on session switch so per-user tab selection doesn't leak across sessions.
            // Otherwise, returning to a previous session can auto-select a read-only guest tab,
            // making edits appear to "snap back".
            key={activeSessionId ?? 'local'}
            users={usersForPrefs}
            games={wizard.filteredGames}
            gameOwners={wizard.gameOwners}
            layoutMode={wizard.layoutMode}
            onLayoutModeChange={wizard.setLayoutMode}
            preferences={preferencesForPrefs}
            userRatings={wizard.userRatings}
            onUpdatePreference={wizard.updatePreference}
            onClearPreference={wizard.clearPreference}
            onReorderPreferences={wizard.reorderPreferences}
            guestStatuses={guestStatuses}
            readOnlyUsernames={readOnlyUsernames}
            syncStatuses={showSyncUI ? syncStatuses : undefined}
            onSyncUser={showSyncUI ? handleSyncUser : undefined}
            hasActiveSession={showSyncUI}
          />
        </Stack>
      );
    }
    case 3:
      return (
        <ResultStep
          topPick={wizard.recommendation.topPick}
          alternatives={wizard.recommendation.alternatives}
          vetoed={wizard.recommendation.vetoed}
          filters={wizard.filters}
          users={wizard.users}
          gameOwners={wizard.gameOwners}
          layoutMode={wizard.layoutMode}
          onLayoutModeChange={wizard.setLayoutMode}
          onPromoteAlternative={wizard.promoteAlternativeToTopPick}
          onSaveNight={onOpenSaveDialog}
          sessionContext={activeSessionId ? {
            isSessionGame: true,
            guestCount: guestStatuses?.length ?? 0,
          } : undefined}
        />
      )
    default:
      return null
  }
}
