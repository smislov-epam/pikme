import Dexie, { type Table } from 'dexie'
import type {
  GameRecord,
  GameNoteRecord,
  SavedNightRecord,
  UserGameRecord,
  UserPreferenceRecord,
  UserRecord,
  WizardStateRecord,
} from './types'

export class PikmeDb extends Dexie {
  games!: Table<GameRecord, number>
  gameNotes!: Table<GameNoteRecord, number>
  users!: Table<UserRecord, string>
  userGames!: Table<UserGameRecord, number>
  userPreferences!: Table<UserPreferenceRecord, number>
  wizardState!: Table<WizardStateRecord, 'singleton'>
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
  await db.savedNights.clear()
}