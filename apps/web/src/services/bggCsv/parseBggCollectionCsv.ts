import Papa from 'papaparse'

export type BggCollectionCsvRow = Record<string, string>

export type ParsedBggCollectionCsv = {
  rows: Array<{
    bggId: number
    name: string
    yearPublished?: number
    minPlayers?: number
    maxPlayers?: number
    playingTimeMinutes?: number
    minPlayTimeMinutes?: number
    maxPlayTimeMinutes?: number
    minAge?: number
    averageRating?: number
    weight?: number
    bestWith?: string
    rating?: number
    comment?: string
    acquisitionDate?: string
    objectType?: string
  }>
  stats: {
    totalRows: number
    ownedRows: number
    skippedNotOwned: number
    skippedExpansions: number
    importedCandidates: number
  }
  errors: Array<{ row: number; message: string }>
  headers: string[]
}

function num(v: string | undefined): number | undefined {
  const trimmed = (v ?? '').trim()
  if (!trimmed) return undefined
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : undefined
}

function int(v: string | undefined): number | undefined {
  const n = num(v)
  if (n === undefined) return undefined
  const i = Math.trunc(n)
  return Number.isFinite(i) ? i : undefined
}

function str(v: string | undefined): string | undefined {
  const trimmed = (v ?? '').trim()
  return trimmed ? trimmed : undefined
}

function parseDateToIso(v: string | undefined): string | undefined {
  const s = (v ?? '').trim()
  if (!s) return undefined

  // Accept ISO timestamps or YYYY-MM-DD
  const iso = new Date(s)
  if (!Number.isNaN(iso.getTime())) return iso.toISOString()

  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) {
    const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`)
    if (!Number.isNaN(d.getTime())) return d.toISOString()
  }

  return undefined
}

function normKey(k: string): string {
  return k.trim().toLowerCase()
}

export function parseBggCollectionCsv(content: string): ParsedBggCollectionCsv {
  const parsed = Papa.parse<BggCollectionCsvRow>(content, {
    header: true,
    skipEmptyLines: 'greedy',
    delimiter: ',',
    // Transform header keys to lowercase for case-insensitive access
    transformHeader: (header) => header.trim().toLowerCase(),
  })

  if (parsed.errors?.length) {
    throw new Error(parsed.errors[0]?.message || 'CSV parse error')
  }

  const rawData = parsed.data ?? []
  const first = rawData[0] ?? {}
  const headers = Object.keys(first)

  const required = ['objectid', 'objectname', 'own']
  const headerSet = new Set(headers.map(normKey))
  const missing = required.filter((h) => !headerSet.has(h))
  if (missing.length) {
    throw new Error(`Missing required columns: ${missing.join(', ')}`)
  }

  const errors: Array<{ row: number; message: string }> = []
  let ownedRows = 0
  let skippedNotOwned = 0
  let skippedExpansions = 0

  const out: ParsedBggCollectionCsv['rows'] = []

  for (let i = 0; i < rawData.length; i++) {
    const rowNumber = i + 2 // header row is 1
    const r = rawData[i] ?? {}

    const bggId = int(r.objectid)
    const name = str(r.objectname) ?? str(r.originalname)
    const own = int(r.own)
    const objectType = str(r.objecttype)

    if (!bggId || !name) {
      errors.push({ row: rowNumber, message: 'Missing objectid or objectname' })
      continue
    }

    if (own === 1) {
      ownedRows += 1
    } else {
      skippedNotOwned += 1
      continue
    }

    if (objectType?.toLowerCase() === 'boardgameexpansion') {
      skippedExpansions += 1
      continue
    }

    out.push({
      bggId,
      name,
      yearPublished: int(r.yearpublished) ?? int(r.year),
      minPlayers: int(r.minplayers),
      maxPlayers: int(r.maxplayers),
      playingTimeMinutes: int(r.playingtime),
      minPlayTimeMinutes: int(r.minplaytime),
      maxPlayTimeMinutes: int(r.maxplaytime),
      minAge: (() => {
        const raw = str(r.bggrecagerange)
        if (!raw) return undefined
        const m = raw.match(/(\d{1,2})/)
        return m ? int(m[1]) : undefined
      })(),
      averageRating: num(r.average) ?? num(r.baverage),
      weight: num(r.weight) ?? num(r.avgweight),
      bestWith: str(r.bggbestplayers) ?? str(r.bggrecplayers),
      rating: num(r.rating),
      comment: str(r.comment),
      acquisitionDate: parseDateToIso(r.acquisitiondate),
      objectType,
    })
  }

  return {
    rows: out,
    stats: {
      totalRows: rawData.length,
      ownedRows,
      skippedNotOwned,
      skippedExpansions,
      importedCandidates: out.length,
    },
    errors,
    headers,
  }
}
