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
  let added = 0;
  let existing = 0;

  const now = new Date().toISOString();

  for (const game of games) {
    const bggId = parseInt(game.gameId, 10);
    if (isNaN(bggId)) continue;

    // Check if game already exists locally
    const existingGame = await db.games.get(bggId);

    if (existingGame) {
      existing++;
    } else {
      // Insert new game
      const gameRecord: GameRecord = {
        bggId,
        name: game.name,
        minPlayers: game.minPlayers ?? undefined,
        maxPlayers: game.maxPlayers ?? undefined,
        playingTimeMinutes: game.playingTimeMinutes ?? undefined,
        thumbnail: game.thumbnail ?? undefined,
        image: game.image ?? undefined,
        mechanics: game.mechanics ?? [],
        categories: game.categories ?? [],
        lastFetchedAt: now,
      };

      await db.games.put(gameRecord);
      added++;
    }

    // Optionally assign to virtual host
    if (assignToHost) {
      // Check if we need to create the virtual host user
      const hostUser = await db.users.get(SESSION_HOST_NAME);
      if (!hostUser) {
        await db.users.put({
          username: SESSION_HOST_NAME,
          internalId: 'session-host',
          displayName: 'Host',
          isBggUser: false,
        });
      }

      // Check if ownership already exists
      const existingOwnership = await db.userGames
        .where('[username+bggId]')
        .equals([SESSION_HOST_NAME, bggId])
        .first();

      if (!existingOwnership) {
        await db.userGames.put({
          username: SESSION_HOST_NAME,
          bggId,
          source: 'manual',
          addedAt: now,
        });
      }
    }
  }

  console.log(
    `[hydrateSessionGames] Added ${added} new games, ${existing} already existed`
  );

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
