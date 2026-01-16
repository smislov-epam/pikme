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
  const owner = await db.users
    .filter((u) => u.isLocalOwner === true && !u.isDeleted)
    .first()
  return owner ?? null
}

/**
 * Check if a local owner exists.
 */
export async function hasLocalOwner(): Promise<boolean> {
  const owner = await getLocalOwner()
  return owner !== null
}
