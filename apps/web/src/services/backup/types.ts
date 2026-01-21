import type { GameNoteRecord, GameRecord, SavedNightRecord, UserGameRecord, UserPreferenceRecord, UserRecord, WizardStateRecord } from '../../db/types'

export type BackupMode = 'replace' | 'merge'

export interface BackupMetadata {
  app: 'pikme'
  backupFormatVersion: number
  createdAt: string
  source?: { userAgent?: string; appVersion?: string }
  counts: Partial<Record<BackupTable, number>>
}

export type BackupTable =
  | 'games'
  | 'game_notes'
  | 'users'
  | 'user_games'
  | 'user_preferences'
  | 'wizard_state'
  | 'saved_nights'

export interface BackupExportResult {
  blob: Blob
  fileName: string
  metadata: BackupMetadata
}

export interface BackupProgress {
  stage: 'export' | 'import'
  message: string
  completed?: number
  total?: number
  table?: BackupTable
}

/** Maps backup username -> local username for user remapping during import */
export type UserMapping = Record<string, string>

export interface ImportOptions {
  mode: BackupMode
  files: File | File[] | Blob | Uint8Array
  /** Optional user mappings: backup username -> local username */
  userMapping?: UserMapping
  /** Username that should be marked as local owner after import (for Replace mode identity mapping) */
  localOwnerUsername?: string
  onProgress?: (progress: BackupProgress) => void
}

export interface ImportSummary {
  mode: BackupMode
  importedAt: string
  counts: Partial<Record<BackupTable, number>>
}

export interface ExportContext {
  games: GameRecord[]
  gameNotes: GameNoteRecord[]
  users: UserRecord[]
  userGames: UserGameRecord[]
  userPreferences: UserPreferenceRecord[]
  wizardState: WizardStateRecord | null
  savedNights: SavedNightRecord[]
}
