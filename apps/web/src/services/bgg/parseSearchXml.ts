import { XMLParser } from 'fast-xml-parser'
import type { BggSearchResult } from './types'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  allowBooleanAttributes: true,
})

interface XmlName {
  type?: string
  value?: string
}

interface XmlSearchItem {
  id?: string | number
  type?: string
  name?: XmlName | XmlName[]
  yearpublished?: { value?: string | number }
}

interface XmlSearchResponse {
  items?: {
    item?: XmlSearchItem | XmlSearchItem[]
  }
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

export function parseSearchXml(xml: string): BggSearchResult[] {
  const parsed = parser.parse(xml) as XmlSearchResponse
  const items = toArray(parsed?.items?.item)

  return items
    .map((item): BggSearchResult | null => {
      const id = Number(item?.id)
      if (!Number.isFinite(id)) return null

      const type = item?.type
      if (type !== 'boardgame' && type !== 'boardgameexpansion') return null

      const names = toArray(item?.name)
      const primary = names.find((n) => n?.type === 'primary')
      const name = String(primary?.value ?? names[0]?.value ?? '').trim()
      if (!name) return null

      const yearPublishedRaw = item?.yearpublished?.value
      const yearPublished =
        yearPublishedRaw != null ? Number(yearPublishedRaw) : undefined

      return {
        bggId: id,
        name,
        yearPublished: Number.isFinite(yearPublished) ? yearPublished : undefined,
        type,
      }
    })
    .filter((x): x is BggSearchResult => x !== null)
}
