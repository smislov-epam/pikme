type PreflightStats = {
  totalRows: number
  ownedRows: number
  skippedNotOwned: number
  skippedExpansions: number
  importedCandidates: number
}

type PreflightError = { row: number; message: string }

type Preflight = {
  stats: PreflightStats
  errors: PreflightError[]
}

export function buildBggCsvPreflightText(fileName: string, pre: Preflight): string {
  const lines: string[] = [
    `File: ${fileName}`,
    `Total rows: ${pre.stats.totalRows}`,
    `Owned rows (own=1): ${pre.stats.ownedRows}`,
    `Skipped (not owned): ${pre.stats.skippedNotOwned}`,
    `Skipped (expansions): ${pre.stats.skippedExpansions}`,
    `Import candidates: ${pre.stats.importedCandidates}`,
  ]

  if (pre.errors.length) {
    lines.push(
      `Errors (showing first 10):\n${pre.errors
        .slice(0, 10)
        .map((e) => `- Row ${e.row}: ${e.message}`)
        .join('\n')}`,
    )
  }

  return lines.filter(Boolean).join('\n')
}
