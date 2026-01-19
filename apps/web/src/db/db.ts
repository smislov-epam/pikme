import Dexie, { type Table } from 'dexie'
import type {
  GameRecord,
  GameNoteRecord,
  SavedNightRecord,
  SessionWizardStateRecord,
  UserGameRecord,
  UserPreferenceRecord,
  UserRecord,
  WizardStateRecord,
} from './types'
import { generateInternalId } from '../services/db/userIdService'

export class PikmeDb extends Dexie {
  games!: Table<GameRecord, number>
  gameNotes!: Table<GameNoteRecord, number>
  users!: Table<UserRecord, string>
  userGames!: Table<UserGameRecord, number>
  userPreferences!: Table<UserPreferenceRecord, number>
  wizardState!: Table<WizardStateRecord, 'singleton'>
  sessionWizardState!: Table<SessionWizardStateRecord, string>
  savedNights!: Table<SavedNightRecord, number>

  constructor() {
    super('pikme')

    this.version(1).stores({
      games: 'bggId, name, lastFetchedAt',
      users: 'username, lastSyncAt',
      userGames: '++id, [username+bggId], username, bggId',
      wizardState: 'id, updatedAt',
      savedNights: '++id, createdAt',
    })

    this.version(2)
      .stores({
        games: 'bggId, name, lastFetchedAt',
        users: 'username, isBggUser, lastSyncAt',
        userGames: '++id, [username+bggId], username, bggId, source, addedAt',
        userPreferences: '++id, [username+bggId], username, bggId, updatedAt',
        wizardState: 'id, updatedAt',
        savedNights: '++id, createdAt',
      })
      .upgrade((tx) => {
        // Migrate existing users to have isBggUser = true (they were all BGG users before)
        return tx
          .table('users')
          .toCollection()
          .modify((user) => {
            user.isBggUser = true
          })
          .then(() => {
            // Migrate existing userGames to have source = 'bgg' and addedAt
            return tx
              .table('userGames')
              .toCollection()
              .modify((userGame) => {
                userGame.source = 'bgg'
                userGame.addedAt = new Date().toISOString()
              })
          })
      })

    this.version(3)
      .stores({
        games: 'bggId, name, lastFetchedAt',
        users: 'username, isBggUser, lastSyncAt',
        userGames: '++id, [username+bggId], username, bggId, source, addedAt',
        userPreferences: '++id, [username+bggId], username, bggId, updatedAt',
        wizardState: 'id, updatedAt',
        savedNights: '++id, createdAt',
      })
      .upgrade((tx) => {
        // Backfill new preference field
        return tx
          .table('userPreferences')
          .toCollection()
          .modify((pref) => {
            if (pref.isDisliked === undefined) pref.isDisliked = false
            if (pref.isTopPick === undefined) pref.isTopPick = false
          })
      })

    this.version(4)
      .stores({
        games: 'bggId, name, lastFetchedAt',
        gameNotes: '++id, bggId, createdAt',
        users: 'username, isBggUser, lastSyncAt',
        userGames: '++id, [username+bggId], username, bggId, source, addedAt',
        userPreferences: '++id, [username+bggId], username, bggId, updatedAt',
        wizardState: 'id, updatedAt',
        savedNights: '++id, createdAt',
      })
      .upgrade(async (tx) => {
        // Migrate legacy single-string notes into timestamped notes.
        const now = new Date().toISOString()
        const games = await tx.table('games').toArray()

        for (const game of games) {
          const legacy = typeof game.userNotes === 'string' ? game.userNotes.trim() : ''
          if (!legacy) continue

          await tx.table('gameNotes').add({
            bggId: game.bggId,
            text: legacy,
            createdAt: now,
          })

          // Clear legacy field so UI doesn't show duplicate sources.
          await tx.table('games').update(game.bggId, { userNotes: undefined })
        }
      })

    this.version(5)
      .stores({
        games: 'bggId, name, lastFetchedAt',
        gameNotes: '++id, bggId, createdAt',
        users: 'username, internalId, isBggUser, lastSyncAt',
        userGames: '++id, [username+bggId], username, bggId, source, addedAt',
        userPreferences: '++id, [username+bggId], username, bggId, updatedAt',
        wizardState: 'id, updatedAt',
        savedNights: '++id, createdAt',
      })
      .upgrade((tx) => {
        // Generate internalId for existing users
        return tx
          .table('users')
          .toCollection()
          .modify((user) => {
            if (!user.internalId) {
              user.internalId = generateInternalId(user.displayName ?? user.username)
            }
          })
      })

    this.version(6)
      .stores({
        games: 'bggId, name, lastFetchedAt',
        gameNotes: '++id, bggId, createdAt',
        users: 'username, internalId, isBggUser, isLocalOwner, firebaseUid, lastSyncAt',
        userGames: '++id, [username+bggId], username, bggId, source, addedAt',
        userPreferences: '++id, [username+bggId], username, bggId, updatedAt',
        wizardState: 'id, updatedAt',
        savedNights: '++id, createdAt',
      })
      .upgrade(async (tx) => {
        // Initialize new identity fields
        // Set the organizer or first user as the local owner
        const users = await tx.table('users').toArray()
        if (users.length === 0) return

        // Find organizer or use first user
        const organizer = users.find((u) => u.isOrganizer) ?? users[0]

        for (const user of users) {
          await tx.table('users').update(user.username, {
            isLocalOwner: user.username === organizer.username,
          })
        }
      })

    // Version 7: Fix for users who already migrated to v6 with no local owner
    this.version(7)
      .stores({
        games: 'bggId, name, lastFetchedAt',
        gameNotes: '++id, bggId, createdAt',
        users: 'username, internalId, isBggUser, isLocalOwner, firebaseUid, lastSyncAt',
        userGames: '++id, [username+bggId], username, bggId, source, addedAt',
        userPreferences: '++id, [username+bggId], username, bggId, updatedAt',
        wizardState: 'id, updatedAt',
        savedNights: '++id, createdAt',
      })
      .upgrade(async (tx) => {
        // Check if any user has isLocalOwner = true
        const users = await tx.table('users').toArray()
        const hasLocalOwner = users.some((u) => u.isLocalOwner === true)

        if (!hasLocalOwner && users.length > 0) {
          // No local owner set - fix by setting organizer or first user
          const organizer = users.find((u) => u.isOrganizer) ?? users[0]
          await tx.table('users').update(organizer.username, {
            isLocalOwner: true,
          })
        }
      })

    // Version 8: Per-session (and draft) wizard state snapshots in Dexie.
    this.version(8).stores({
      games: 'bggId, name, lastFetchedAt',
      gameNotes: '++id, bggId, createdAt',
      users: 'username, internalId, isBggUser, isLocalOwner, firebaseUid, lastSyncAt',
      userGames: '++id, [username+bggId], username, bggId, source, addedAt',
      userPreferences: '++id, [username+bggId], username, bggId, updatedAt',
      wizardState: 'id, updatedAt',
      sessionWizardState: 'id, updatedAt',
      savedNights: '++id, createdAt',
    })
  }
}

export const db = new PikmeDb()

/**
 * Clear all data from all tables in the database
 */
export async function clearAllData(): Promise<void> {
  await db.games.clear()
  await db.gameNotes.clear()
  await db.users.clear()
  await db.userGames.clear()
  await db.userPreferences.clear()
  await db.wizardState.clear()
  await db.sessionWizardState.clear()
  await db.savedNights.clear()
}