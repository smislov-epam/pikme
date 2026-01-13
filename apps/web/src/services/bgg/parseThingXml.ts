import { XMLParser } from 'fast-xml-parser'
import type { BggThingDetails } from './types'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  allowBooleanAttributes: true,
})

type XmlObject = Record<string, unknown>

function asObject(value: unknown): XmlObject | undefined {
  if (value && typeof value === 'object') return value as XmlObject
  return undefined
}

function toArrayUnknown(value: unknown): unknown[] {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}

function readNumberAttribute(node: unknown, key: string): number | undefined {
  const obj = asObject(node)
  const rawNode = obj?.[key]
  const rawObj = asObject(rawNode)
  const raw = rawObj?.value ?? rawNode
  const n = raw != null ? Number(raw) : NaN
  return Number.isFinite(n) ? n : undefined
}

function normalizeBestWith(raw: string): string | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined

  // BGG poll-summary typically uses: "Best with 2, 4 players"
  const withoutPrefix = trimmed.replace(/^best\s+with\s+/i, '')
  const withoutSuffix = withoutPrefix.replace(/\s*players?\s*$/i, '')
  const normalized = withoutSuffix.trim()
  return normalized || undefined
}

function extractBestWithFromPollSummary(item: unknown): string | undefined {
  const itemObj = asObject(item)
  const pollSummaries = toArrayUnknown(itemObj?.['poll-summary'])
  for (const pollSummary of pollSummaries) {
    const pollSummaryObj = asObject(pollSummary)
    const results = toArrayUnknown(pollSummaryObj?.result)
    const bestWith = results
      .map((r) => asObject(r))
      .find((r) => r?.name === 'bestwith')
    const value = typeof bestWith?.value === 'string' ? bestWith.value : undefined
    const normalized = value ? normalizeBestWith(value) : undefined
    if (normalized) return normalized
  }
  return undefined
}

/**
 * Extract "Best with X players" from the suggested_numplayers poll
 * Returns the player count(s) with the highest "Best" votes
 */
function extractBestWith(item: unknown): string | undefined {
  const itemObj = asObject(item)
  const polls = toArrayUnknown(itemObj?.poll)
  const numPlayersPoll = polls
    .map((p) => asObject(p))
    .find((p) => p?.name === 'suggested_numplayers')
  if (!numPlayersPoll) return undefined

  const allResults = toArrayUnknown(numPlayersPoll.results)
  let maxVotes = 0
  const bestCounts: number[] = []

  for (const resultsGroup of allResults) {
    const resultsGroupObj = asObject(resultsGroup)
    const numplayers = typeof resultsGroupObj?.numplayers === 'string' ? resultsGroupObj.numplayers : undefined
    if (!numplayers || numplayers === '0' || numplayers.includes('+')) continue

    const resultItems = toArrayUnknown(resultsGroupObj?.result)
    const bestResult = resultItems
      .map((r) => asObject(r))
      .find((r) => r?.value === 'Best')
    const votes = typeof bestResult?.numvotes === 'string' ? parseInt(bestResult.numvotes, 10) : 0

    if (votes > maxVotes) {
      maxVotes = votes
      bestCounts.length = 0
      bestCounts.push(parseInt(numplayers, 10))
    } else if (votes === maxVotes && votes > 0) {
      bestCounts.push(parseInt(numplayers, 10))
    }
  }

  if (bestCounts.length === 0 || maxVotes === 0) return undefined

  bestCounts.sort((a, b) => a - b)
  
  // Format as "4" or "3-4" for consecutive ranges
  if (bestCounts.length === 1) {
    return String(bestCounts[0])
  }
  
  // Check if consecutive
  const isConsecutive = bestCounts.every((v, i, arr) => i === 0 || v === arr[i - 1] + 1)
  if (isConsecutive) {
    return `${bestCounts[0]}-${bestCounts[bestCounts.length - 1]}`
  }
  
  return bestCounts.join(', ')
}

export function parseThingXml(xml: string): BggThingDetails[] {
  const parsed = parser.parse(xml) as unknown
  const parsedObj = asObject(parsed)
  const itemsRoot = asObject(parsedObj?.items)
  const items = toArrayUnknown(itemsRoot?.item)

  return items
    .map((item: unknown): BggThingDetails | null => {
      const itemObj = asObject(item)
      const id = Number(itemObj?.id)
      if (!Number.isFinite(id)) return null

      const names = toArrayUnknown(itemObj?.name)
      const primary = names
        .map((n) => asObject(n))
        .find((n) => n?.type === 'primary')
      const firstName = asObject(names[0])
      const name = String(primary?.value ?? firstName?.value ?? '').trim()
      if (!name) return null

      const links = toArrayUnknown(itemObj?.link)

      const mechanics = links
        .map((l) => asObject(l))
        .filter((l) => l?.type === 'boardgamemechanic')
        .map((l) => String(l?.value ?? '').trim())
        .filter(Boolean)

      const categories = links
        .map((l) => asObject(l))
        .filter((l) => l?.type === 'boardgamecategory')
        .map((l) => String(l?.value ?? '').trim())
        .filter(Boolean)

      const yearPublished = readNumberAttribute(itemObj, 'yearpublished')

      // Extract description (strip HTML tags)
      let description: string | undefined
      if (typeof itemObj?.description === 'string') {
        description = itemObj.description
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#10;/g, '\n')
          .trim()
          .slice(0, 500) // Limit length
      }

      // Extract rating and weight from statistics
      const statisticsObj = asObject(itemObj?.statistics)
      const ratingsObj = asObject(statisticsObj?.ratings)
      const averageObj = asObject(ratingsObj?.average)
      const averageWeightObj = asObject(ratingsObj?.averageweight)
      const averageRating = typeof averageObj?.value === 'string' ? parseFloat(averageObj.value) : undefined
      const weight = typeof averageWeightObj?.value === 'string' ? parseFloat(averageWeightObj.value) : undefined

      const bestWith = extractBestWithFromPollSummary(item) ?? extractBestWith(item)

      return {
        bggId: id,
        name,
        yearPublished,
        thumbnail: typeof itemObj?.thumbnail === 'string' ? itemObj.thumbnail : undefined,
        image: typeof itemObj?.image === 'string' ? itemObj.image : undefined,
        minPlayers: readNumberAttribute(itemObj, 'minplayers'),
        maxPlayers: readNumberAttribute(itemObj, 'maxplayers'),
        bestWith,
        playingTimeMinutes: readNumberAttribute(itemObj, 'playingtime'),
        minPlayTimeMinutes: readNumberAttribute(itemObj, 'minplaytime'),
        maxPlayTimeMinutes: readNumberAttribute(itemObj, 'maxplaytime'),
        minAge: readNumberAttribute(itemObj, 'minage'),
        mechanics: mechanics.length ? mechanics : undefined,
        categories: categories.length ? categories : undefined,
        description,
        averageRating: Number.isFinite(averageRating) ? averageRating : undefined,
        weight: Number.isFinite(weight) ? weight : undefined,
      }
    })
    .filter((x: BggThingDetails | null): x is BggThingDetails => x !== null)
}
