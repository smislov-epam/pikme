/**
 * Extract timestamp from backup file name
 */
export function extractBackupStamp(fileName: string): string | null {
  const m = fileName.match(/(\d{12})/)
  return m ? m[1] : null
}

/**
 * Format timestamp as date/time string
 */
export function formatStampAsDateTime(stamp: string): string {
  const yyyy = stamp.slice(0, 4)
  const mm = stamp.slice(4, 6)
  const dd = stamp.slice(6, 8)
  const hh = stamp.slice(8, 10)
  const min = stamp.slice(10, 12)
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`
}

/**
 * Get date label from backup file name
 */
export function backupDateLabelFromFileName(fileName: string): string {
  const stamp = extractBackupStamp(fileName)
  if (!stamp) return 'Selected backup'
  return `Backup date: ${formatStampAsDateTime(stamp)}`
}

/**
 * Format bytes as human-readable string
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return ''
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(1)} MB`
  const gb = mb / 1024
  return `${gb.toFixed(1)} GB`
}
