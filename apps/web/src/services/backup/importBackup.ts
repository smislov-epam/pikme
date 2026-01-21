import { unzipSync, strFromU8 } from 'fflate'
import { BACKUP_FORMAT_VERSION, BACKUP_META_FILE } from './constants'
import { applyMerge, applyReplace } from './applyImport'
import { collectTables, countsFor, applyUserMapping } from './parseTables'
import type { BackupMetadata, BackupProgress, ImportOptions, ImportSummary } from './types'

/** Info about a user in the backup file for preview/mapping UI */
export interface BackupUserInfo {
  username: string
  displayName?: string
  gameCount: number
  preferenceCount: number
  isBggUser: boolean
}

/** Preview info for a backup file before import */
export interface BackupPreviewInfo {
  metadata: BackupMetadata
  users: BackupUserInfo[]
}

function notify(onProgress: ((p: BackupProgress) => void) | undefined, p: BackupProgress) {
  if (onProgress) onProgress(p)
}

async function readFileToU8(file: File | Blob | Uint8Array): Promise<Uint8Array> {
  if (file instanceof Uint8Array) return file
  const maybeArrayBuffer = (file as { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer
  if (maybeArrayBuffer) {
    const buf = await maybeArrayBuffer.call(file)
    return new Uint8Array(buf)
  }
  const buf = await new Response(file).arrayBuffer()
  return new Uint8Array(buf)
}

function looksLikeZip(data: Uint8Array): boolean {
  return data.length > 1 && data[0] === 0x50 && data[1] === 0x4b
}

async function buildFileMap(input: File | File[] | Blob | Uint8Array): Promise<Record<string, Uint8Array>> {
  const files = Array.isArray(input) ? input : [input]
  if (files.length === 1) {
    const single = files[0]
    const data = await readFileToU8(single)
    const name = 'name' in single && typeof (single as File).name === 'string' ? (single as File).name : 'upload'
    try {
      const unzipped = unzipSync(data)
      if (unzipped && Object.keys(unzipped).length > 0) return unzipped
    } catch {
      // not a zip; fall back to raw map
    }
    if (name.toLowerCase().endsWith('.zip') || looksLikeZip(data)) return unzipSync(data)
    return { [name]: data }
  }
  const map: Record<string, Uint8Array> = {}
  for (const f of files) {
    const name = 'name' in f && typeof (f as File).name === 'string' ? (f as File).name : 'upload'
    map[name] = await readFileToU8(f)
  }
  return map
}

function expectMeta(files: Record<string, Uint8Array>): BackupMetadata {
  const metaRaw = files[BACKUP_META_FILE]
  if (!metaRaw) throw new Error('Metadata file missing')
  const meta = JSON.parse(strFromU8(metaRaw)) as BackupMetadata
  if (meta.app !== 'pikme') throw new Error('Invalid backup app id')
  if (meta.backupFormatVersion !== BACKUP_FORMAT_VERSION) throw new Error('Unsupported backup version')
  return meta
}

/**
 * Preview backup contents without importing.
 * Returns metadata and user info for mapping UI.
 */
export async function previewBackup(files: File | File[] | Blob | Uint8Array): Promise<BackupPreviewInfo> {
  const fileMap = await buildFileMap(files)
  const metadata = expectMeta(fileMap)
  const payload = collectTables(fileMap)

  // Build user info with game/preference counts
  const gameCountsByUser = new Map<string, number>()
  for (const ug of payload.userGames) {
    gameCountsByUser.set(ug.username, (gameCountsByUser.get(ug.username) ?? 0) + 1)
  }

  const prefCountsByUser = new Map<string, number>()
  for (const up of payload.userPreferences) {
    prefCountsByUser.set(up.username, (prefCountsByUser.get(up.username) ?? 0) + 1)
  }

  const users: BackupUserInfo[] = payload.users.map((u) => ({
    username: u.username,
    displayName: u.displayName,
    gameCount: gameCountsByUser.get(u.username) ?? 0,
    preferenceCount: prefCountsByUser.get(u.username) ?? 0,
    isBggUser: u.isBggUser ?? false,
  }))

  return { metadata, users }
}

export async function importBackup(options: ImportOptions): Promise<ImportSummary> {
  const { files, mode, userMapping, localOwnerUsername, onProgress } = options
  notify(onProgress, { stage: 'import', message: 'Reading backup' })
  const fileMap = await buildFileMap(files)
  expectMeta(fileMap)
  let payload = collectTables(fileMap)
  
  // Apply user mapping if provided
  if (userMapping && Object.keys(userMapping).length > 0) {
    notify(onProgress, { stage: 'import', message: 'Applying user mappings' })
    payload = applyUserMapping(payload, userMapping, localOwnerUsername)
  }
  
  notify(onProgress, { stage: 'import', message: 'Applying data', table: 'games' })

  if (mode === 'replace') await applyReplace(payload)
  else await applyMerge(payload)

  const counts = countsFor(payload)

  notify(onProgress, { stage: 'import', message: 'Done', completed: 1, total: 1 })
  return { mode, importedAt: new Date().toISOString(), counts }
}
