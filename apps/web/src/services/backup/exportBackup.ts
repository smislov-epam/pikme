import Papa from 'papaparse'
import { zipSync, strToU8 } from 'fflate'
import { db } from '../../db'
import { BACKUP_DEFAULT_NAME_PREFIX, BACKUP_FORMAT_VERSION, BACKUP_META_FILE } from './constants'
import type { BackupExportResult, BackupMetadata, BackupProgress, BackupTable, ExportContext } from './types'

function notify(onProgress: BackupProgress['stage'] extends never ? never : ((p: BackupProgress) => void) | undefined, p: BackupProgress) {
  if (onProgress) onProgress(p)
}

function toIsoDate() {
  return new Date().toISOString()
}

function json(obj: unknown) {
  return JSON.stringify(obj ?? null)
}

function withArrayBuffer(blob: Blob, bytes: Uint8Array): Blob {
  const maybe = blob as Blob & { arrayBuffer?: () => Promise<ArrayBuffer> }
  if (!maybe.arrayBuffer) {
    maybe.arrayBuffer = async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  }
  return blob
}

function toCsv(fields: string[], rows: Record<string, unknown>[]) {
  return Papa.unparse(rows, { columns: fields, header: true })
}

function mapGames(ctx: ExportContext) {
  const fields = [
    'bggId',
    'name',
    'yearPublished',
    'thumbnail',
    'image',
    'minPlayers',
    'maxPlayers',
    'bestWith',
    'playingTimeMinutes',
    'minPlayTimeMinutes',
    'maxPlayTimeMinutes',
    'minAge',
    'mechanicsJson',
    'categoriesJson',
    'description',
    'averageRating',
    'weight',
    'userNotes',
    'lastFetchedAt',
  ]
  const rows = ctx.games.map((g) => ({
    ...g,
    mechanicsJson: g.mechanics ? json(g.mechanics) : '',
    categoriesJson: g.categories ? json(g.categories) : '',
  }))
  return { file: 'games.csv', fields, rows }
}

function mapGameNotes(ctx: ExportContext) {
  const fields = ['id', 'bggId', 'text', 'createdAt']
  const rows = ctx.gameNotes
  return { file: 'game_notes.csv', fields, rows }
}

function mapUsers(ctx: ExportContext) {
  const fields = ['username', 'displayName', 'isBggUser', 'isOrganizer', 'lastSyncAt', 'ownedCount']
  const rows = ctx.users
  return { file: 'users.csv', fields, rows }
}

function mapUserGames(ctx: ExportContext) {
  const fields = ['id', 'username', 'bggId', 'rating', 'source', 'addedAt']
  const rows = ctx.userGames
  return { file: 'user_games.csv', fields, rows }
}

function mapUserPreferences(ctx: ExportContext) {
  const fields = ['id', 'username', 'bggId', 'rank', 'isTopPick', 'isDisliked', 'updatedAt']
  const rows = ctx.userPreferences
  return { file: 'user_preferences.csv', fields, rows }
}

function mapWizardState(ctx: ExportContext) {
  const fields = ['id', 'dataJson', 'updatedAt']
  const rows = ctx.wizardState ? [{ id: 'singleton', dataJson: json(ctx.wizardState.data), updatedAt: ctx.wizardState.updatedAt }] : []
  return { file: 'wizard_state.csv', fields, rows }
}

function mapSavedNights(ctx: ExportContext) {
  const fields = ['id', 'createdAt', 'dataJson']
  const rows = ctx.savedNights.map((n) => ({ ...n, dataJson: json(n.data) }))
  return { file: 'saved_nights.csv', fields, rows }
}

async function readContext(): Promise<ExportContext> {
  const [games, gameNotes, users, userGames, userPreferences, wizardState, savedNights] = await Promise.all([
    db.games.toArray(),
    db.gameNotes.toArray(),
    db.users.toArray(),
    db.userGames.toArray(),
    db.userPreferences.toArray(),
    db.wizardState.get('singleton'),
    db.savedNights.toArray(),
  ])
  return { games, gameNotes, users, userGames, userPreferences, wizardState: wizardState ?? null, savedNights }
}

function makeMetadata(ctx: ExportContext): BackupMetadata {
  return {
    app: 'pikme',
    backupFormatVersion: BACKUP_FORMAT_VERSION,
    createdAt: toIsoDate(),
    source: { userAgent: navigator.userAgent },
    counts: {
      games: ctx.games.length,
      game_notes: ctx.gameNotes.length,
      users: ctx.users.length,
      user_games: ctx.userGames.length,
      user_preferences: ctx.userPreferences.length,
      wizard_state: ctx.wizardState ? 1 : 0,
      saved_nights: ctx.savedNights.length,
    },
  }
}

export async function exportBackupZip(onProgress?: (p: BackupProgress) => void): Promise<BackupExportResult> {
  notify(onProgress, { stage: 'export', message: 'Reading data' })
  const ctx = await readContext()

  const tables = [mapGames, mapGameNotes, mapUsers, mapUserGames, mapUserPreferences, mapWizardState, mapSavedNights]
  const files: Record<string, Uint8Array> = {}

  tables.forEach((mapper) => {
    const { file, fields, rows } = mapper(ctx)
    const csv = toCsv(fields, rows)
    files[file] = Uint8Array.from(strToU8(csv))
  })

  const metadata = makeMetadata(ctx)
  files[BACKUP_META_FILE] = Uint8Array.from(strToU8(JSON.stringify(metadata, null, 2)))

  notify(onProgress, { stage: 'export', message: 'Bundling backup', total: tables.length, completed: tables.length })
  const zipped = zipSync(files, { level: 6 })
  const blob = withArrayBuffer(new Blob([zipped], { type: 'application/zip' }), zipped)
  const stamp = metadata.createdAt.replace(/[-:TZ]/g, '').slice(0, 12)
  const fileName = `${BACKUP_DEFAULT_NAME_PREFIX}-${stamp}.zip`

  return { blob, fileName, metadata }
}
