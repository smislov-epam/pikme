/**
 * Data loader for guest session state (REQ-106).
 */
import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db';
import type { GameRecord, UserRecord, UserPreferenceRecord } from '../../../db/types';

export interface SessionFilters {
  playerCount: { min: number; max: number } | null;
  timeRange: { min: number; max: number } | null;
  gameCount: number;
}

export interface SessionGuestData {
  localOwner: UserRecord | null;
  games: GameRecord[];
  gameOwners: Record<number, string[]>;
  preferences: Record<string, UserPreferenceRecord[]>;
  userRatings: Record<string, Record<number, number | undefined>>;
  users: UserRecord[];
  sessionFilters: SessionFilters | null;
  isLoading: boolean;
  sessionGameIds: number[];
}

export function useSessionGuestData(sessionId: string): SessionGuestData {
  const scopedGameIdsKey = sessionId ? `guestSessionGameIds:${sessionId}` : 'guestSessionGameIds'

  const [sessionGameIds] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem(scopedGameIdsKey) ?? localStorage.getItem('guestSessionGameIds')
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((id) => typeof id === 'number' && Number.isFinite(id));
    } catch {
      return [];
    }
  });

  const localOwner = useLiveQuery(async () => {
    return db.users.filter((u) => u.isLocalOwner === true && !u.isDeleted).first();
  }, []);

  const gamesQuery = useLiveQuery(async () => {
    if (sessionGameIds.length === 0) return [];
    return db.games.where('bggId').anyOf(sessionGameIds).toArray();
  }, [sessionGameIds.join(',')]);

  const preferencesQuery = useLiveQuery(async () => {
    if (!localOwner) return [];
    return db.userPreferences.where('username').equals(localOwner.username).toArray();
  }, [localOwner?.username]);

  const userGamesQuery = useLiveQuery(async () => {
    if (!localOwner) return [];
    return db.userGames.where('username').equals(localOwner.username).toArray();
  }, [localOwner?.username]);

  const isLoading =
    localOwner === undefined ||
    gamesQuery === undefined ||
    preferencesQuery === undefined ||
    userGamesQuery === undefined;

  const games = useMemo(() => gamesQuery ?? [], [gamesQuery]);

  const preferences = useMemo(() => {
    if (!localOwner) return {};
    return { [localOwner.username]: preferencesQuery ?? [] };
  }, [localOwner, preferencesQuery]);

  const userRatings = useMemo(() => {
    if (!localOwner || !userGamesQuery) return {};
    const ratings: Record<number, number | undefined> = {};
    for (const ug of userGamesQuery) {
      ratings[ug.bggId] = ug.rating;
    }
    return { [localOwner.username]: ratings };
  }, [localOwner, userGamesQuery]);

  const gameOwners = useMemo(() => ({} as Record<number, string[]>), []);

  const users: UserRecord[] = useMemo(() => (localOwner ? [localOwner] : []), [localOwner]);

  const sessionFilters: SessionFilters | null = useMemo(() => {
    if (games.length === 0) return null;
    const playerCounts = games
      .filter((g) => g.minPlayers && g.maxPlayers)
      .flatMap((g) => [g.minPlayers!, g.maxPlayers!]);
    const playTimes = games
      .filter((g) => g.playingTimeMinutes)
      .map((g) => g.playingTimeMinutes!);

    return {
      playerCount: playerCounts.length > 0 ? { min: Math.min(...playerCounts), max: Math.max(...playerCounts) } : null,
      timeRange: playTimes.length > 0 ? { min: Math.min(...playTimes), max: Math.max(...playTimes) } : null,
      gameCount: games.length,
    };
  }, [games]);

  return {
    localOwner: localOwner ?? null,
    games,
    gameOwners,
    preferences,
    userRatings,
    users,
    sessionFilters,
    isLoading,
    sessionGameIds,
  };
}
