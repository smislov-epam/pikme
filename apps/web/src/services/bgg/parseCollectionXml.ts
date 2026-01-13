import { XMLParser } from 'fast-xml-parser'
import type { BggCollectionItem } from './types'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  allowBooleanAttributes: true,
})

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getRecord(value: unknown, key: string): Record<string, unknown> | undefined {
  if (!isRecord(value)) return undefined
  const v = value[key]
  return isRecord(v) ? v : undefined
}

function getValue(value: unknown, key: string): unknown {
  if (!isRecord(value)) return undefined
  return value[key]
}

export function parseCollectionXml(xml: string): BggCollectionItem[] {
  const parsed = parser.parse(xml) as unknown
  const itemsRoot = getRecord(parsed, 'items')
  const items = toArray(getValue(itemsRoot, 'item') as unknown)

  return items
    .map((item): BggCollectionItem | null => {
      const id = Number(getValue(item, 'objectid'))
      if (!Number.isFinite(id)) return null

      const nameNode = getValue(item, 'name')
      const nameText =
        (isRecord(nameNode) ? nameNode['#text'] : undefined) ?? nameNode ?? ''
      const name = String(nameText).trim()
      if (!name) return null

      const yearPublishedRaw = getValue(item, 'yearpublished')
      const yearPublished = yearPublishedRaw != null ? Number(yearPublishedRaw) : undefined

      const stats = getRecord(item, 'stats')
      const rating = getRecord(stats, 'rating')
      const userRatingRaw = getValue(rating, 'value')
      const userRating =
        userRatingRaw != null && userRatingRaw !== 'N/A' ? Number(userRatingRaw) : undefined

      return {
        bggId: id,
        name,
        yearPublished: Number.isFinite(yearPublished) ? yearPublished : undefined,
        userRating: Number.isFinite(userRating) ? userRating : undefined,
      }
    })
    .filter((x: BggCollectionItem | null): x is BggCollectionItem => x !== null)
}
