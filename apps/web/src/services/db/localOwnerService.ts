/**
 * Local Owner Service
 *
 * Pure service functions for managing the local owner identity.
 * See Requirements/user-journeys.md for the full identity model.
 *
 * Use the useLocalOwner hook for React components.
 * Use these functions in non-React contexts (services, effects, etc.).
 */

import { db } from '../../db'
import type { UserRecord } from '../../db/types'

/**
 * Get the local owner user record, or null if not set.
 */
export async function getLocalOwner(): Promise<UserRecord | null> {
  const owners = await db.users
    .filter((u) => u.isLocalOwner === true && !u.isDeleted)
    .toArray()

  if (owners.length === 0) return null
  if (owners.length === 1) return owners[0]

  // If duplicates exist (can happen via double-invoked effects), keep one
  // deterministically and demote the rest.
  const keeper =
    owners.find((u) => Boolean(u.firebaseUid)) ??
    owners.find((u) => Boolean(u.linkedAt)) ??
    owners.sort((a, b) => a.username.localeCompare(b.username))[0]

  await db.transaction('rw', db.users, async () => {
    await Promise.all(
      owners
        .filter((u) => u.username !== keeper.username)
        .map((u) => db.users.update(u.username, { isLocalOwner: false }))
    )
  })

  return keeper
}

/**
 * Check if a local owner exists.
 */
export async function hasLocalOwner(): Promise<boolean> {
  const owner = await getLocalOwner()
  return owner !== null
}
