import { db } from '../../db'
import type { UserRecord } from '../../db/types'

export async function createBggUser(username: string): Promise<UserRecord> {
  const record: UserRecord = {
    username,
    isBggUser: true,
  }

  await db.users.put(record)
  return record
}

export async function createLocalUser(
  username: string,
  displayName?: string,
  isOrganizer?: boolean,
): Promise<UserRecord> {
  const record: UserRecord = {
    username,
    displayName,
    isBggUser: false,
    isOrganizer,
  }

  await db.users.put(record)
  return record
}

export async function setUserAsOrganizer(username: string): Promise<void> {
  // First, clear organizer from all users
  const allUsers = await db.users.toArray()
  await Promise.all(
    allUsers.map((u) =>
      db.users.update(u.username, { isOrganizer: u.username === username })
    )
  )
}

export async function getOrganizer(): Promise<UserRecord | undefined> {
  const users = await db.users.toArray()
  return users.find((u) => u.isOrganizer)
}

export async function upsertUser(
  user: Omit<UserRecord, 'isBggUser'> & { isBggUser?: boolean },
): Promise<UserRecord> {
  const existing = await db.users.get(user.username)
  const record: UserRecord = {
    ...existing,
    ...user,
    isBggUser: user.isBggUser ?? existing?.isBggUser ?? true,
  }

  await db.users.put(record)
  return record
}

export async function getUser(
  username: string,
): Promise<UserRecord | undefined> {
  return db.users.get(username)
}

export async function getAllUsers(): Promise<UserRecord[]> {
  return db.users.toArray()
}

export async function getBggUsers(): Promise<UserRecord[]> {
  return db.users.where('isBggUser').equals(1).toArray()
}

export async function getLocalUsers(): Promise<UserRecord[]> {
  const allUsers = await db.users.toArray()
  return allUsers.filter(u => !u.isBggUser)
}

export async function updateUserLastSync(username: string): Promise<void> {
  await db.users.update(username, {
    lastSyncAt: new Date().toISOString(),
  })
}

export async function updateUserOwnedCount(
  username: string,
  ownedCount: number,
): Promise<void> {
  await db.users.update(username, { ownedCount })
}

export async function deleteUser(username: string): Promise<void> {
  await db.transaction(
    'rw',
    [db.users, db.userGames, db.userPreferences],
    async () => {
      await db.userGames.where('username').equals(username).delete()
      await db.userPreferences.where('username').equals(username).delete()
      await db.users.delete(username)
    },
  )
}
