/**
 * Session Game Hydration Service (REQ-103)
 *
 * Loads session games into local Dexie DB for guest users.
 * Games are stored locally without owner info.
 */

import { db } from '../../db';
import type { GameRecord } from '../../db/types';
import type { SessionGameInfo } from './types';

/** Virtual host name for session games without a local owner */
const SESSION_HOST_NAME = '__session_host__';

/**
 * Hydrate session games into local Dexie database.
 *
 * - Games that already exist locally are skipped.
 * - New games are inserted with current timestamp.
 * - Optionally assigns games to a virtual "Host" owner.
 *
 * @param games Games from getSessionGames
 * @param assignToHost If true, mark games as owned by the host
 * @returns Number of new games added
 */
export async function hydrateSessionGames(
  games: SessionGameInfo[],
  assignToHost = false
): Promise<{ added: number; existing: number }> {
  const now = new Date().toISOString();

  // Parse and dedupe IDs up front to batch Dexie calls
  const parsed = games
    .map((g) => ({ ...g, bggId: Number.parseInt(g.gameId, 10) }))
    .filter((g) => Number.isFinite(g.bggId));

  const uniqueIds = Array.from(new Set(parsed.map((g) => g.bggId)));

  let added = 0;
  let existing = 0;

  await db.transaction('rw', db.games, db.users, db.userGames, async () => {
    const existingGames = await db.games.bulkGet(uniqueIds);
    const existingIdSet = new Set<number>();
    existingGames.forEach((g) => {
      if (g?.bggId !== undefined) existingIdSet.add(g.bggId);
    });

    const newGameRecords: GameRecord[] = [];
    for (const g of parsed) {
      if (existingIdSet.has(g.bggId)) {
        existing++;
        continue;
      }
      newGameRecords.push({
        bggId: g.bggId,
        name: g.name,
        minPlayers: g.minPlayers ?? undefined,
        maxPlayers: g.maxPlayers ?? undefined,
        playingTimeMinutes: g.playingTimeMinutes ?? undefined,
        thumbnail: g.thumbnail ?? undefined,
        image: g.image ?? undefined,
        mechanics: g.mechanics ?? [],
        categories: g.categories ?? [],
        lastFetchedAt: now,
      });
      added++;
    }

    if (newGameRecords.length > 0) {
      await db.games.bulkPut(newGameRecords);
    }

    if (!assignToHost || parsed.length === 0) return;

    // Ensure virtual host exists once
    const hostUser = await db.users.get(SESSION_HOST_NAME);
    if (!hostUser) {
      await db.users.put({
        username: SESSION_HOST_NAME,
        internalId: 'session-host',
        displayName: 'Host',
        isBggUser: false,
      });
    }

    // Build ownership keys and check existing in one query
    const ownershipKeys = uniqueIds.map((id) => [SESSION_HOST_NAME, id] as [string, number]);
    const existingOwnerships = await db.userGames
      .where('[username+bggId]')
      .anyOf(ownershipKeys)
      .toArray();
    const ownedSet = new Set(existingOwnerships.map((o) => o.bggId));

    const newOwnerships = uniqueIds
      .filter((id) => !ownedSet.has(id))
      .map((id) => ({
        username: SESSION_HOST_NAME,
        bggId: id,
        source: 'manual' as const,
        addedAt: now,
      }));

    if (newOwnerships.length > 0) {
      await db.userGames.bulkPut(newOwnerships);
    }
  });

  return { added, existing };
}

/**
 * Get the virtual host username used for session games.
 */
export function getSessionHostUsername(): string {
  return SESSION_HOST_NAME;
}

/**
 * Check if a username is the virtual session host.
 */
export function isSessionHost(username: string): boolean {
  return username === SESSION_HOST_NAME;
}
