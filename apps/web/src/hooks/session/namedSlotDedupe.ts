import type { UserRecord, UserPreferenceRecord } from '../../db/types'
import type { SessionGuest } from '../useSessionGuests'

function normalizeDisplayName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function computeHiddenLocalUsernames(args: {
  wizardUsers: UserRecord[]
  sessionGuests: SessionGuest[]
}): Set<string> {
  const localUsersByNormName = new Map<string, string>()
  for (const u of args.wizardUsers) {
    const norm = normalizeDisplayName(u.displayName || u.username)
    if (!localUsersByNormName.has(norm)) {
      localUsersByNormName.set(norm, u.username)
    }
  }

  const hidden = new Set<string>()
  for (const guest of args.sessionGuests) {
    if (!guest.participantId.startsWith('named-')) continue
    const guestName = guest.user.displayName || ''
    if (!guestName) continue
    const localUsername = localUsersByNormName.get(normalizeDisplayName(guestName))
    if (localUsername) hidden.add(localUsername)
  }

  return hidden
}

export function mergeUsersWithNamedSlotDedupe(args: {
  wizardUsers: UserRecord[]
  sessionGuests: SessionGuest[]
  hiddenLocalUsernames: Set<string>
}): UserRecord[] {
  const byUsername = new Map(
    args.wizardUsers
      .filter((u) => !args.hiddenLocalUsernames.has(u.username))
      .map((u) => [u.username, u])
  )

  for (const guest of args.sessionGuests) {
    if (!byUsername.has(guest.user.username)) {
      byUsername.set(guest.user.username, guest.user)
    }
  }

  return Array.from(byUsername.values())
}

export function mergePreferencesWithNamedSlotDedupe(args: {
  wizardUsers: UserRecord[]
  wizardPreferences: Record<string, UserPreferenceRecord[]>
  sessionGuests: SessionGuest[]
  hiddenLocalUsernames: Set<string>
}): Record<string, UserPreferenceRecord[]> {
  const merged: Record<string, UserPreferenceRecord[]> = { ...args.wizardPreferences }

  if (args.hiddenLocalUsernames.size > 0) {
    const localUsersByNormName = new Map<string, string>()
    for (const u of args.wizardUsers) {
      const norm = normalizeDisplayName(u.displayName || u.username)
      if (!localUsersByNormName.has(norm)) {
        localUsersByNormName.set(norm, u.username)
      }
    }

    for (const guest of args.sessionGuests) {
      if (!guest.participantId.startsWith('named-')) continue
      const guestName = guest.user.displayName || ''
      if (!guestName) continue
      const localUsername = localUsersByNormName.get(normalizeDisplayName(guestName))
      if (!localUsername) continue
      if (!args.hiddenLocalUsernames.has(localUsername)) continue

      if (guest.preferences.length === 0) {
        merged[guest.user.username] = merged[localUsername] ?? []
      }
    }
  }

  for (const guest of args.sessionGuests) {
    if (guest.preferences.length > 0) {
      merged[guest.user.username] = guest.preferences
    } else {
      merged[guest.user.username] ??= []
    }
  }

  return merged
}
