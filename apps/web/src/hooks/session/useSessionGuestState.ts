/**
 * useSessionGuestState Hook (REQ-106)
 *
 * Manages state for returning users who join a session with "Use My Preferences".
 * Unlike useGuestPreferences (simplified guest flow), this uses the local owner's
 * existing preferences and persists to Dexie DB.
 */

import { useState, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import type { GameRecord, UserRecord, UserPreferenceRecord } from '../../db/types';
import { loadLayoutMode, saveLayoutMode, type LayoutMode } from '../../services/storage/uiPreferences';
import { normalizePreferenceUpdate } from '../../services/preferences/preferenceRules';

export interface SessionFilters {
  playerCount: { min: number; max: number } | null;
  timeRange: { min: number; max: number } | null;
  gameCount: number;
}

export interface SessionGuestStateResult {
  /** The local owner user */
  localOwner: UserRecord | null;
  /** Session games */
  games: GameRecord[];
  /** Game owners map */
  gameOwners: Record<number, string[]>;
  /** Preferences map */
  preferences: Record<string, UserPreferenceRecord[]>;
  /** User ratings */
  userRatings: Record<string, Record<number, number | undefined>>;
  /** Users array (local owner only) */
  users: UserRecord[];
  /** Session filter summary */
  sessionFilters: SessionFilters | null;
  /** Layout mode */
  layoutMode: LayoutMode;
  /** Whether data is loading */
  isLoading: boolean;
  /** Whether ready has been submitted */
  isReady: boolean;
  /** Whether preferences have changed since last ready submit */
  hasChanges: boolean;
  /** Error message */
  error: string | null;
  /** Set layout mode */
  setLayoutMode: (mode: LayoutMode) => void;
  /** Update a preference */
  updatePreference: (
    username: string,
    bggId: number,
    update: { rank?: number; isTopPick?: boolean; isDisliked?: boolean }
  ) => Promise<void>;
  /** Reorder preferences */
  reorderPreferences: (username: string, orderedBggIds: number[]) => void;
  /** Clear a preference */
  clearPreference: (username: string, bggId: number) => Promise<void>;
  /** Mark as ready (initial or update) */
  markReady: () => Promise<void>;
}

/** localStorage key for persisting ready state */
const GUEST_READY_KEY = 'guestIsReady';

function getGuestReadyState(sessionId: string): boolean {
  try {
    const stored = localStorage.getItem(GUEST_READY_KEY);
    if (!stored) return false;
    const data = JSON.parse(stored) as { sessionId: string; ready: boolean };
    return data.sessionId === sessionId && data.ready === true;
  } catch {
    return false;
  }
}

function setGuestReadyState(sessionId: string, ready: boolean): void {
  localStorage.setItem(GUEST_READY_KEY, JSON.stringify({ sessionId, ready }));
}

/** Create a snapshot key for comparing preferences */
function createPrefsSnapshot(prefs: UserPreferenceRecord[]): string {
  const sorted = [...prefs].sort((a, b) => a.bggId - b.bggId);
  return JSON.stringify(
    sorted.map((p) => ({
      bggId: p.bggId,
      rank: p.rank ?? null,
      isTopPick: p.isTopPick ?? false,
      isDisliked: p.isDisliked ?? false,
    }))
  );
}

export function useSessionGuestState(sessionId: string): SessionGuestStateResult {
  const [layoutMode, setLayoutModeState] = useState<LayoutMode>(() => {
    try { return loadLayoutMode(); } catch { return 'standard'; }
  });
  const [isReady, setIsReady] = useState(() => getGuestReadyState(sessionId));
  const [isMarkingReady, setIsMarkingReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Snapshot of preferences at the time of last submit
  const [submittedSnapshot, setSubmittedSnapshot] = useState<string | null>(null);

  // Get session game IDs from localStorage
  const [sessionGameIds] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem('guestSessionGameIds');
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((id) => typeof id === 'number' && Number.isFinite(id));
    } catch {
      return [];
    }
  });

  // Load local owner from Dexie
  const localOwner = useLiveQuery(async () => {
    return db.users.filter((u) => u.isLocalOwner === true && !u.isDeleted).first();
  }, []);

  // Load session games from Dexie
  const gamesQuery = useLiveQuery(async () => {
    if (sessionGameIds.length === 0) return [];
    return db.games.where('bggId').anyOf(sessionGameIds).toArray();
  }, [sessionGameIds.join(',')]);

  // Load user preferences from Dexie
  const preferencesQuery = useLiveQuery(async () => {
    if (!localOwner) return [];
    return db.userPreferences.where('username').equals(localOwner.username).toArray();
  }, [localOwner?.username]);

  // Load user games for ratings
  const userGamesQuery = useLiveQuery(async () => {
    if (!localOwner) return [];
    return db.userGames.where('username').equals(localOwner.username).toArray();
  }, [localOwner?.username]);

  // Check if data is still loading
  const isLoading = localOwner === undefined || gamesQuery === undefined || 
                    preferencesQuery === undefined || userGamesQuery === undefined;

  const games = useMemo(() => gamesQuery ?? [], [gamesQuery]);

  // Format preferences as Record<username, prefs[]>
  const preferences = useMemo(() => {
    if (!localOwner) return {};
    return { [localOwner.username]: preferencesQuery ?? [] };
  }, [localOwner, preferencesQuery]);

  // User ratings from userGames
  const userRatings = useMemo(() => {
    if (!localOwner || !userGamesQuery) return {};
    const ratings: Record<number, number | undefined> = {};
    for (const ug of userGamesQuery) {
      ratings[ug.bggId] = ug.rating;
    }
    return { [localOwner.username]: ratings };
  }, [localOwner, userGamesQuery]);

  // Game owners (empty for session context)
  const gameOwners = useMemo(() => ({} as Record<number, string[]>), []);

  // Users array
  const users: UserRecord[] = useMemo(() => {
    return localOwner ? [localOwner] : [];
  }, [localOwner]);

  // Session filters summary (could be enhanced with actual filter data)
  const sessionFilters: SessionFilters | null = useMemo(() => {
    if (games.length === 0) return null;
    
    // Calculate ranges from actual games
    const playerCounts = games
      .filter(g => g.minPlayers && g.maxPlayers)
      .flatMap(g => [g.minPlayers!, g.maxPlayers!]);
    const playTimes = games
      .filter(g => g.playingTimeMinutes)
      .map(g => g.playingTimeMinutes!);

    return {
      playerCount: playerCounts.length > 0 
        ? { min: Math.min(...playerCounts), max: Math.max(...playerCounts) }
        : null,
      timeRange: playTimes.length > 0
        ? { min: Math.min(...playTimes), max: Math.max(...playTimes) }
        : null,
      gameCount: games.length,
    };
  }, [games]);

  // Layout mode handler
  const setLayoutMode = useCallback((mode: LayoutMode) => {
    setLayoutModeState(mode);
    try { saveLayoutMode(mode); } catch { /* ignore */ }
  }, []);

  // Update preference in Dexie
  const updatePreference = useCallback(
    async (
      username: string,
      bggId: number,
      update: { rank?: number; isTopPick?: boolean; isDisliked?: boolean }
    ) => {
      const now = new Date().toISOString();
      const existing = await db.userPreferences
        .where('[username+bggId]')
        .equals([username, bggId])
        .first();

      if (existing) {
        const normalized = normalizePreferenceUpdate(existing, update);
        await db.userPreferences.update(existing.id!, { ...normalized, updatedAt: now });
      } else {
        const normalized = normalizePreferenceUpdate(undefined, update);
        await db.userPreferences.add({
          username,
          bggId,
          rank: normalized.rank,
          isTopPick: normalized.isTopPick,
          isDisliked: normalized.isDisliked,
          updatedAt: now,
        });
      }
    },
    []
  );

  // Reorder preferences
  const reorderPreferences = useCallback(
    async (username: string, orderedBggIds: number[]) => {
      const now = new Date().toISOString();
      await db.transaction('rw', db.userPreferences, async () => {
        for (let i = 0; i < orderedBggIds.length; i++) {
          const bggId = orderedBggIds[i];
          const existing = await db.userPreferences
            .where('[username+bggId]')
            .equals([username, bggId])
            .first();
          if (existing) {
            await db.userPreferences.update(existing.id!, { 
              rank: i + 1,
              isTopPick: false,
              isDisliked: false,
              updatedAt: now 
            });
          }
        }
      });
    },
    []
  );

  // Clear preference
  const clearPreference = useCallback(
    async (username: string, bggId: number) => {
      await db.userPreferences
        .where('[username+bggId]')
        .equals([username, bggId])
        .delete();
    },
    []
  );

  // Mark as ready (or update if already ready)
  const markReady = useCallback(async () => {
    if (!localOwner) return;
    
    setIsMarkingReady(true);
    setError(null);

    try {
      const { submitGuestPreferences, setGuestReady } = await import('../../services/session');
      const currentPrefs = preferencesQuery ?? [];
      
      await submitGuestPreferences(
        sessionId,
        currentPrefs.map((p) => ({
          bggId: p.bggId,
          rank: p.rank ?? null,
          isTopPick: p.isTopPick ?? false,
          isDisliked: p.isDisliked ?? false,
        }))
      );
      await setGuestReady(sessionId);
      
      // Save snapshot of submitted preferences
      setSubmittedSnapshot(createPrefsSnapshot(currentPrefs));
      setGuestReadyState(sessionId, true);
      setIsReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as ready');
    } finally {
      setIsMarkingReady(false);
    }
  }, [localOwner, preferencesQuery, sessionId]);

  // Check if preferences have changed since last submit
  const hasChanges = useMemo(() => {
    if (!isReady || !submittedSnapshot) return false;
    const currentSnapshot = createPrefsSnapshot(preferencesQuery ?? []);
    return currentSnapshot !== submittedSnapshot;
  }, [isReady, submittedSnapshot, preferencesQuery]);

  return {
    localOwner: localOwner ?? null,
    games,
    gameOwners,
    preferences,
    userRatings,
    users,
    sessionFilters,
    layoutMode,
    isLoading: isLoading || isMarkingReady,
    isReady,
    hasChanges,
    error,
    setLayoutMode,
    updatePreference,
    reorderPreferences,
    clearPreference,
    markReady,
  };
}
