/**
 * useLocalOwner Hook
 *
 * Manages the "local owner" concept - the device owner's identity.
 * See Requirements/user-journeys.md for the full identity model.
 *
 * Key behaviors:
 * - Only ONE user can have isLocalOwner=true in the database
 * - isLocalOwner is permanent (set once during first-time setup)
 * - isOrganizer can change per game night
 */

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { UserRecord } from '../db/types'
import { generateInternalId } from '../services/db/userIdService'

export interface LocalOwnerState {
  /** The local owner user record, or null if not set */
  localOwner: UserRecord | null
  /** Whether we're still loading from database */
  isLoading: boolean
  /** Whether a local owner exists */
  hasLocalOwner: boolean
}

/**
 * Hook to get the current local owner from the database.
 * Returns loading state while querying Dexie.
 */
export function useLocalOwner(): LocalOwnerState {
  // Use a wrapper object to distinguish "loading" from "no result"
  // useLiveQuery returns undefined while loading, and { value: undefined } when query completes with no match
  const result = useLiveQuery(
    async () => {
      const owner = await db.users.filter((u) => u.isLocalOwner === true && !u.isDeleted).first();
      return { value: owner };
    },
    []
  );

  // undefined means still loading, { value: ... } means query completed
  const isLoading = result === undefined;
  const localOwner = result?.value ?? null;

  return {
    localOwner,
    isLoading,
    hasLocalOwner: !!localOwner,
  };
}

export interface CreateLocalOwnerParams {
  displayName: string
  isBggUser?: boolean
  bggUsername?: string // If BGG user, this is their BGG username
}

/**
 * Create a new local owner user.
 * This should only be called during first-time setup.
 *
 * @throws Error if a local owner already exists
 */
export async function createLocalOwner(params: CreateLocalOwnerParams): Promise<UserRecord> {
  const { displayName, isBggUser = false, bggUsername } = params

  // Check if local owner already exists
  const existing = await db.users.filter((u) => u.isLocalOwner === true).first()
  if (existing) {
    throw new Error('Local owner already exists. Cannot create another.')
  }

  const username = isBggUser && bggUsername ? bggUsername : generateInternalId(displayName)
  const internalId = isBggUser && bggUsername ? bggUsername : username

  const newUser: UserRecord = {
    username,
    internalId,
    displayName,
    isBggUser,
    isLocalOwner: true,
    isOrganizer: true, // Default to organizer for their own game nights
  }

  await db.users.add(newUser)
  return newUser
}

/**
 * Link an existing local owner to a Firebase UID.
 * Called when user registers or signs in with Firebase.
 */
export async function linkLocalOwnerToFirebase(firebaseUid: string): Promise<void> {
  const localOwner = await db.users.filter((u) => u.isLocalOwner === true).first()
  if (!localOwner) {
    throw new Error('No local owner to link. Setup required first.')
  }

  await db.users.update(localOwner.username, {
    firebaseUid,
    linkedAt: new Date().toISOString(),
  })
}

/**
 * Set an existing user as the local owner.
 * Used when claiming identity from a session invite.
 */
export async function setUserAsLocalOwner(username: string): Promise<void> {
  // First, clear any existing local owner
  await db.users
    .filter((u) => u.isLocalOwner === true)
    .modify({ isLocalOwner: false })

  // Set the specified user as local owner
  await db.users.update(username, { isLocalOwner: true })
}
