import Papa from 'papaparse'
import { strFromU8 } from 'fflate'
import type { BackupTable } from './types'
import { generateInternalId } from '../db/userIdService'

export type ParsedTables = ReturnType<typeof collectTables>

function parseCsv(content: string) {
  const result = Papa.parse<Record<string, string>>(content, { header: true, skipEmptyLines: 'greedy', delimiter: ',' })
  if (result.errors.length) throw new Error(result.errors[0].message)
  return result.data
}

function num(v?: string) {
  if (v === undefined || v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function bool(v?: string) {
  if (v === 'true') return true
  if (v === 'false') return false
  return undefined
}

function json(v?: string) {
  if (!v) return undefined
  try { return JSON.parse(v) } catch { return undefined }
}

function readText(files: Record<string, Uint8Array>, name: string) {
  const file = files[name]
  if (!file) throw new Error(`Missing required file: ${name}`)
  return strFromU8(file)
}

export function collectTables(files: Record<string, Uint8Array>) {
  const games = parseCsv(readText(files, 'games.csv')).map((r: Record<string, string>) => ({
    bggId: Number(r.bggId),
    name: r.name,
    yearPublished: num(r.yearPublished),
    thumbnail: r.thumbnail || undefined,
    image: r.image || undefined,
    minPlayers: num(r.minPlayers),
    maxPlayers: num(r.maxPlayers),
    bestWith: r.bestWith || undefined,
    playingTimeMinutes: num(r.playingTimeMinutes),
    minPlayTimeMinutes: num(r.minPlayTimeMinutes),
    maxPlayTimeMinutes: num(r.maxPlayTimeMinutes),
    minAge: num(r.minAge),
    mechanics: json(r.mechanicsJson),
    categories: json(r.categoriesJson),
    description: r.description || undefined,
    averageRating: num(r.averageRating),
    weight: num(r.weight),
    userNotes: r.userNotes || undefined,
    lastFetchedAt: r.lastFetchedAt,
  }))

  const gameNotes = parseCsv(readText(files, 'game_notes.csv')).map((r: Record<string, string>) => ({
    id: num(r.id),
    bggId: Number(r.bggId),
    text: r.text,
    createdAt: r.createdAt,
  }))

  const users = parseCsv(readText(files, 'users.csv')).map((r: Record<string, string>) => ({
    username: r.username,
    internalId: r.internalId || generateInternalId(r.displayName || r.username),
    displayName: r.displayName || undefined,
    isBggUser: bool(r.isBggUser) ?? false,
    isOrganizer: bool(r.isOrganizer),
    lastSyncAt: r.lastSyncAt || undefined,
    ownedCount: num(r.ownedCount),
    isDeleted: bool(r.isDeleted) ?? false,
  }))

  const userGames = parseCsv(readText(files, 'user_games.csv')).map((r: Record<string, string>) => ({
    id: num(r.id),
    username: r.username,
    bggId: Number(r.bggId),
    rating: num(r.rating),
    source: (r.source as 'bgg' | 'manual') ?? 'bgg',
    addedAt: r.addedAt,
  }))

  const userPreferences = parseCsv(readText(files, 'user_preferences.csv')).map((r: Record<string, string>) => {
    const pref = {
      id: num(r.id),
      username: r.username,
      bggId: Number(r.bggId),
      rank: num(r.rank),
      isTopPick: bool(r.isTopPick) ?? false,
      isDisliked: bool(r.isDisliked) ?? false,
      updatedAt: r.updatedAt,
    }
    return pref.isDisliked ? { ...pref, rank: undefined, isTopPick: false } : pref
  })

  const wizardStateRows = parseCsv(readText(files, 'wizard_state.csv'))
  const wizardState = wizardStateRows[0]
    ? { id: 'singleton' as const, data: json(wizardStateRows[0].dataJson), updatedAt: wizardStateRows[0].updatedAt }
    : null

  const savedNights = parseCsv(readText(files, 'saved_nights.csv')).map((r: Record<string, string>) => ({
    id: num(r.id),
    createdAt: r.createdAt,
    data: json(r.dataJson),
  }))

  return { games, gameNotes, users, userGames, userPreferences, wizardState, savedNights }
}

export function countsFor(payload: ParsedTables): Partial<Record<BackupTable, number>> {
  return {
    games: payload.games.length,
    game_notes: payload.gameNotes.length,
    users: payload.users.length,
    user_games: payload.userGames.length,
    user_preferences: payload.userPreferences.length,
    wizard_state: payload.wizardState ? 1 : 0,
    saved_nights: payload.savedNights.length,
  }
}
