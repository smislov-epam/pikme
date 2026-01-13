import type { PartialGameInfo } from './partialGameInfo'

export function extractFromHtml(html: string, bggId: number): PartialGameInfo {
  const info: PartialGameInfo = { bggId }

  const geekData = extractGeekPreload(html)
  if (geekData) Object.assign(info, geekData)

  const jsonLd = extractJsonLd(html)
  if (jsonLd) {
    if (!info.name && typeof jsonLd.name === 'string') info.name = jsonLd.name
    if (!info.thumbnail && typeof jsonLd.image === 'string') info.thumbnail = jsonLd.image
  }

  const og = extractOpenGraph(html)
  if (!info.name && og.title) {
    const yearMatch = og.title.match(/^(.+?)\s*\((\d{4})\)\s*$/)
    if (yearMatch) {
      info.name = yearMatch[1].trim()
      info.yearPublished = parseInt(yearMatch[2], 10)
    } else {
      info.name = og.title
    }
  }
  if (!info.thumbnail && og.image) info.thumbnail = og.image

  const patterns = extractHtmlPatterns(html)
  if (!info.minPlayers) info.minPlayers = patterns.minPlayers
  if (!info.maxPlayers) info.maxPlayers = patterns.maxPlayers
  if (!info.playingTimeMinutes) info.playingTimeMinutes = patterns.playingTime
  if (!info.minPlayTimeMinutes) info.minPlayTimeMinutes = patterns.minPlayTime
  if (!info.maxPlayTimeMinutes) info.maxPlayTimeMinutes = patterns.maxPlayTime
  if (!info.minAge) info.minAge = patterns.minAge

  if (!info.bestWith) info.bestWith = extractBestWithFromHtml(html)
  if (!info.weight) info.weight = extractWeightFromHtml(html)
  if (!info.description) info.description = extractMetaDescription(html)

  const embedded = extractEmbeddedNumericFields(html)
  if (!info.minPlayers) info.minPlayers = embedded.minPlayers
  if (!info.maxPlayers) info.maxPlayers = embedded.maxPlayers
  if (!info.minPlayTimeMinutes) info.minPlayTimeMinutes = embedded.minPlayTimeMinutes
  if (!info.maxPlayTimeMinutes) info.maxPlayTimeMinutes = embedded.maxPlayTimeMinutes
  if (!info.minAge) info.minAge = embedded.minAge

  if (!info.playingTimeMinutes && (info.minPlayTimeMinutes || info.maxPlayTimeMinutes)) {
    const min = info.minPlayTimeMinutes ?? info.maxPlayTimeMinutes ?? 0
    const max = info.maxPlayTimeMinutes ?? info.minPlayTimeMinutes ?? 0
    if (min && max) info.playingTimeMinutes = Math.round((min + max) / 2)
  }

  return info
}

function decodeHtml(text: string): string {
  if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea')
    textarea.innerHTML = text
    return textarea.value
  }

  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function extractMetaDescription(html: string): string | undefined {
  const meta =
    html.match(
      /<meta\s+(?:name="description"\s+content="([^"]+)"|content="([^"]+)"\s+name="description")[^>]*>/i
    ) ??
    html.match(
      /<meta\s+(?:property="og:description"\s+content="([^"]+)"|content="([^"]+)"\s+property="og:description")[^>]*>/i
    )

  const raw = decodeHtml(meta?.[1] || meta?.[2] || '')
  if (!raw) return undefined
  return raw.trim().slice(0, 500)
}

function extractBestWithFromHtml(html: string): string | undefined {
  const m = html.match(/\bBest\s*:\s*([^<\n\r]+)/i)
  const raw = m?.[1]?.trim()
  if (!raw) return undefined

  const cleaned = raw
    .replace(/players?/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/[–—]/g, '-')
    .trim()

  const normalized = cleaned.match(
    /\d+(?:\s*-\s*\d+)?(?:\s*,\s*\d+(?:\s*-\s*\d+)?)*$/
  )?.[0]

  return normalized
    ? normalized.replace(/\s*-\s*/g, '-').replace(/\s*,\s*/g, ', ')
    : undefined
}

function extractWeightFromHtml(html: string): number | undefined {
  const fromText = html.match(/\bWeight\s*:\s*([0-9]+(?:\.[0-9]+)?)/i)?.[1]
  if (fromText) {
    const n = Number(fromText)
    return Number.isFinite(n) ? n : undefined
  }

  const readJsonNumber = (key: string): string | undefined => {
    const m = html.match(
      new RegExp(
        `"${key}"\\s*:\\s*(?:"([0-9]+(?:\\.[0-9]+)?)"|([0-9]+(?:\\.[0-9]+)?))`,
        'i'
      )
    )
    return m?.[1] ?? m?.[2]
  }

  const fromJson = readJsonNumber('avgweight') ?? readJsonNumber('boardgameweight')
  if (!fromJson) return undefined
  const n = Number(fromJson)
  return Number.isFinite(n) ? n : undefined
}

function extractEmbeddedNumericFields(html: string): Pick<
  PartialGameInfo,
  'minPlayers' | 'maxPlayers' | 'minPlayTimeMinutes' | 'maxPlayTimeMinutes' | 'minAge'
> {
  const read = (key: string): number | undefined => {
    const re = new RegExp(`"${key}"\\s*:\\s*(?:"(\\d+)"|(\\d+))`, 'i')
    const m = html.match(re)
    const raw = m?.[1] ?? m?.[2]
    if (!raw) return undefined
    const n = Number(raw)
    return Number.isFinite(n) ? n : undefined
  }

  return {
    minPlayers: read('minplayers'),
    maxPlayers: read('maxplayers'),
    minPlayTimeMinutes: read('minplaytime'),
    maxPlayTimeMinutes: read('maxplaytime'),
    minAge: read('minage'),
  }
}

function extractGeekPreload(html: string): Partial<PartialGameInfo> | null {
  const match = html.match(/GEEK\.geekitemPreload\s*=\s*(\{[\s\S]*?\});/i)
  if (!match) return null

  try {
    const data = JSON.parse(match[1]) as unknown
    if (!isRecord(data)) return null

    const item = isRecord(data.item) ? data.item : undefined
    if (!item) return null

    const primaryName =
      isRecord(item.name) && typeof item.name.primary === 'string'
        ? item.name.primary
        : undefined

    const yearPublished =
      typeof item.yearpublished === 'number'
        ? item.yearpublished
        : toNumber(item.yearpublished)

    const image = typeof item.imageurl === 'string' ? item.imageurl : undefined
    const minPlayers = toNumber(item.minplayers)
    const maxPlayers = toNumber(item.maxplayers)
    const minAge = toNumber(item.minage)
    const minPlayTimeMinutes = toNumber(item.minplaytime)
    const maxPlayTimeMinutes = toNumber(item.maxplaytime)

    return {
      name: primaryName,
      thumbnail: image,
      yearPublished: yearPublished,
      minPlayers,
      maxPlayers,
      minAge,
      minPlayTimeMinutes,
      maxPlayTimeMinutes,
    }
  } catch {
    return null
  }
}

function extractJsonLd(html: string): unknown | null {
  const match = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i)
  if (!match) return null

  try {
    return JSON.parse(match[1]) as unknown
  } catch {
    return null
  }
}

function extractOpenGraph(html: string): { title?: string; image?: string } {
  const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"[^>]*>/i)?.[1]
  const ogImage = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"[^>]*>/i)?.[1]
  return {
    title: ogTitle ? decodeHtml(ogTitle).trim() : undefined,
    image: ogImage ? decodeHtml(ogImage).trim() : undefined,
  }
}

function extractHtmlPatterns(html: string): {
  minPlayers?: number
  maxPlayers?: number
  minPlayTime?: number
  maxPlayTime?: number
  playingTime?: number
  minAge?: number
} {
  const result: {
    minPlayers?: number
    maxPlayers?: number
    minPlayTime?: number
    maxPlayTime?: number
    playingTime?: number
    minAge?: number
  } = {}

  const playersMatch =
    html.match(/(\d+)\s*[-–—]\s*(\d+)\s*Players/i) ||
    html.match(/Players\s*:?\s*(\d+)\s*[-–—]\s*(\d+)/i)

  if (playersMatch) {
    result.minPlayers = parseInt(playersMatch[1], 10)
    result.maxPlayers = parseInt(playersMatch[2], 10)
  }

  const timeMatch =
    html.match(/(\d+)[–\-—](\d+)\s*Min/i) || html.match(/>(\d+)\s*Min</i)

  if (timeMatch) {
    if (timeMatch[2]) {
      result.minPlayTime = parseInt(timeMatch[1], 10)
      result.maxPlayTime = parseInt(timeMatch[2], 10)
      result.playingTime = Math.round((result.minPlayTime + result.maxPlayTime) / 2)
    } else {
      result.playingTime = parseInt(timeMatch[1], 10)
    }
  }

  const ageMatch =
    html.match(/Age[:\s]*(\d+)\+/i) || html.match(/>(\d+)\+\s*<\/span>/i)

  if (ageMatch) {
    result.minAge = parseInt(ageMatch[1], 10)
  }

  return result
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toNumber(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : undefined
}
