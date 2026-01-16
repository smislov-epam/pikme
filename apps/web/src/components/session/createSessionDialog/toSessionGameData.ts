import type { GameRecord } from '../../../db/types';

/** Convert GameRecord to SessionGameData format. */
export function toSessionGameData(game: GameRecord) {
  return {
    gameId: String(game.bggId),
    name: game.name,
    minPlayers: game.minPlayers ?? null,
    maxPlayers: game.maxPlayers ?? null,
    playingTimeMinutes: game.playingTimeMinutes ?? null,
    thumbnail: game.thumbnail ?? null,
    image: game.image ?? null,
    mechanics: game.mechanics ?? [],
    categories: game.categories ?? [],
    source: 'bgg' as const,
  };
}
