import { db } from '../../db'
import type { GameRecord, UserGameRecord } from '../../db/types'
import * as dbService from '../db'
import { parseBggCollectionCsv } from './parseBggCollectionCsv'
import { readBlobText } from './readBlobText'
import { chunk, pick, pickEarlierIso, pickIsoMax } from './importBggCollectionCsvUtils'

export type ImportBggCollectionCsvResult = {
  username: string
  totalRows: number
  imported: number
  skippedNotOwned: number
  skippedExpansions: number
  errors: Array<{ row: number; message: string }>
}

export async function importBggCollectionCsv(params: {
  file: Blob
  username: string
  onProgress?: (message: string) => void
}): Promise<ImportBggCollectionCsvResult> {
  const { file, username, onProgress } = params
  const now = new Date().toISOString()

  const content = await readBlobText(file)
  const parsed = parseBggCollectionCsv(content)

  if (parsed.rows.length === 0) {
    throw new Error('No owned base-game rows found to import')
  }

  onProgress?.('Preparing import…')

  await db.transaction('rw', [db.users, db.games, db.userGames, db.gameNotes], async () => {
    await dbService.upsertUser({ username, isBggUser: true, lastSyncAt: now })

    // Games: merge by bggId, keep existing richer fields.
    const bggIds = parsed.rows.map((r) => r.bggId)
    const existingGames = await db.games.where('bggId').anyOf(bggIds).toArray()
    const existingGamesMap = new Map(existingGames.map((g) => [g.bggId, g]))

    const gameUpserts: GameRecord[] = parsed.rows.map((r) => {
      const existing = existingGamesMap.get(r.bggId)
      const incoming: GameRecord = {
        bggId: r.bggId,
        name: r.name,
        yearPublished: r.yearPublished,
        minPlayers: r.minPlayers,
        maxPlayers: r.maxPlayers,
        playingTimeMinutes: r.playingTimeMinutes,
        minPlayTimeMinutes: r.minPlayTimeMinutes,
        maxPlayTimeMinutes: r.maxPlayTimeMinutes,
        minAge: r.minAge,
        averageRating: r.averageRating,
        weight: r.weight,
        bestWith: r.bestWith,
        // No images in CSV import – filled via explicit per-game refresh.
        thumbnail: undefined,
        image: undefined,
        mechanics: undefined,
        categories: undefined,
        description: undefined,
        userNotes: undefined,
        lastFetchedAt: now,
      }

      if (!existing) return incoming

      return {
        ...existing,
        name: pick(existing.name, incoming.name) ?? existing.name,
        yearPublished: pick(existing.yearPublished, incoming.yearPublished),
        minPlayers: pick(existing.minPlayers, incoming.minPlayers),
        maxPlayers: pick(existing.maxPlayers, incoming.maxPlayers),
        playingTimeMinutes: pick(existing.playingTimeMinutes, incoming.playingTimeMinutes),
        minPlayTimeMinutes: pick(existing.minPlayTimeMinutes, incoming.minPlayTimeMinutes),
        maxPlayTimeMinutes: pick(existing.maxPlayTimeMinutes, incoming.maxPlayTimeMinutes),
        minAge: pick(existing.minAge, incoming.minAge),
        averageRating: pick(existing.averageRating, incoming.averageRating),
        weight: pick(existing.weight, incoming.weight),
        bestWith: pick(existing.bestWith, incoming.bestWith),
        lastFetchedAt: pickIsoMax(existing.lastFetchedAt, now),
      }
    })

    onProgress?.(`Upserting games… (${gameUpserts.length})`)
    await db.games.bulkPut(gameUpserts)

    // UserGames: upsert by (username, bggId) and keep existing where CSV is empty.
    const existingUserGames: UserGameRecord[] = []
    for (const pairChunk of chunk(bggIds.map((id) => [username, id] as [string, number]), 500)) {
      const chunkRecords = await db.userGames.where('[username+bggId]').anyOf(pairChunk).toArray()
      existingUserGames.push(...chunkRecords)
    }

    const byBggId = new Map<number, UserGameRecord[]>()
    for (const ug of existingUserGames) {
      const list = byBggId.get(ug.bggId) ?? []
      list.push(ug)
      byBggId.set(ug.bggId, list)
    }

    // Clean duplicates if they exist (should not happen, but makes merge deterministic).
    const duplicateIdsToDelete: number[] = []
    for (const list of byBggId.values()) {
      if (list.length <= 1) continue
      list.sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
      for (let i = 1; i < list.length; i++) {
        const id = list[i].id
        if (typeof id === 'number') duplicateIdsToDelete.push(id)
      }
    }
    if (duplicateIdsToDelete.length) {
      await db.userGames.bulkDelete(duplicateIdsToDelete)
    }

    const canonicalByBggId = new Map<number, UserGameRecord>()
    for (const list of byBggId.values()) {
      list.sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
      canonicalByBggId.set(list[0].bggId, list[0])
    }

    const userGameUpserts: UserGameRecord[] = parsed.rows.map((r) => {
      const existing = canonicalByBggId.get(r.bggId)
      const rating = r.rating !== undefined ? r.rating : existing?.rating
      const addedAt = r.acquisitionDate
        ? pickEarlierIso(existing?.addedAt, r.acquisitionDate)
        : (existing?.addedAt ?? now)

      return {
        id: existing?.id,
        username,
        bggId: r.bggId,
        rating,
        source: existing?.source ?? 'bgg',
        addedAt,
      }
    })

    onProgress?.(`Upserting ownership… (${userGameUpserts.length})`)
    await db.userGames.bulkPut(userGameUpserts)

    // Optional: convert comment into a game note (dedupe by identical text per game).
    const notesToAdd = parsed.rows
      .filter((r) => (r.comment ?? '').trim().length > 0)
      .map((r) => ({ bggId: r.bggId, text: (r.comment ?? '').trim() }))

    if (notesToAdd.length) {
      const existingNotes = await db.gameNotes.where('bggId').anyOf(notesToAdd.map((n) => n.bggId)).toArray()
      const existingByGame = new Map<number, Set<string>>()
      for (const n of existingNotes) {
        const set = existingByGame.get(n.bggId) ?? new Set<string>()
        set.add(n.text)
        existingByGame.set(n.bggId, set)
      }

      const inserts = notesToAdd
        .filter((n) => !(existingByGame.get(n.bggId)?.has(n.text) ?? false))
        .map((n) => ({ bggId: n.bggId, text: n.text, createdAt: now }))

      if (inserts.length) {
        onProgress?.(`Adding notes… (${inserts.length})`)
        await db.gameNotes.bulkAdd(inserts)
      }
    }

    const ownedCount = await db.userGames.where('username').equals(username).count()
    await dbService.updateUserOwnedCount(username, ownedCount)
  })

  return {
    username,
    totalRows: parsed.stats.totalRows,
    imported: parsed.stats.importedCandidates,
    skippedNotOwned: parsed.stats.skippedNotOwned,
    skippedExpansions: parsed.stats.skippedExpansions,
    errors: parsed.errors,
  }
}
