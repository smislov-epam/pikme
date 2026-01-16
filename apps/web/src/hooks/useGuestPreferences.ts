/**
 * useGuestPreferences Hook (REQ-103)
 *
 * Manages preferences state for guest users in a session.
 * Provides loading of games, preferences, and handlers for preference updates.
 * Guest preferences are kept in-memory and submitted when Ready is clicked.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { UserRecord, UserPreferenceRecord } from '../db/types';
import { loadLayoutMode, saveLayoutMode, type LayoutMode } from '../services/storage/uiPreferences';
import { normalizePreferenceUpdate } from '../services/preferences/preferenceRules';

/** Username for the guest user in local DB */
export const GUEST_USERNAME = '__session_guest__';

export interface UseGuestPreferencesResult {
  /** The guest user record */
  guestUser: UserRecord | null;
  /** All session games */
  games: import('../db/types').GameRecord[];
  /** Game owners map */
  gameOwners: Record<number, string[]>;
  /** Preferences map by username */
  preferences: Record<string, UserPreferenceRecord[]>;
  /** User ratings (empty for guests) */
  userRatings: Record<string, Record<number, number | undefined>>;
  /** Users array (just the guest) */
  users: UserRecord[];
  /** Layout mode */
  layoutMode: LayoutMode;
  /** Whether data is still loading */
  isLoading: boolean;
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
}

export function useGuestPreferences(): UseGuestPreferencesResult {
  const [layoutMode, setLayoutModeState] = useState<LayoutMode>(() => {
    try { return loadLayoutMode(); } catch { return 'standard'; }
  });
  const [localPrefs, setLocalPrefs] = useState<UserPreferenceRecord[]>([]);
  const [prefsInitialized, setPrefsInitialized] = useState(false);

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

  // Ensure guest user exists (write operation - separate from liveQuery)
  const [guestUserCreated, setGuestUserCreated] = useState(false);
  useEffect(() => {
    async function ensureGuestUser() {
      const existing = await db.users.get(GUEST_USERNAME);
      if (!existing) {
        const displayName = localStorage.getItem('guestDisplayName') || 'Guest';
        await db.users.put({
          username: GUEST_USERNAME,
          internalId: GUEST_USERNAME,
          displayName,
          isBggUser: false,
        });
      }
      setGuestUserCreated(true);
    }
    ensureGuestUser();
  }, []);

  // Load guest user from Dexie (read-only query, runs after user is created)
  const guestUser = useLiveQuery(
    async () => (guestUserCreated ? db.users.get(GUEST_USERNAME) : undefined),
    [guestUserCreated]
  );

  // Load session games from Dexie using the session game ID list.
  // useLiveQuery returns undefined until the query completes.
  const gamesQuery = useLiveQuery(async () => {
    if (sessionGameIds.length === 0) return [];
    return db.games.where('bggId').anyOf(sessionGameIds).toArray();
  }, [sessionGameIds.join(',')]);

  // Track whether all queries have resolved (not undefined)
  const guestUserLoaded = guestUser !== undefined;
  const gamesLoaded = gamesQuery !== undefined;

  const isGuestPrefSeed = (value: unknown): value is {
    bggId: number | string
    rank?: number
    isTopPick?: boolean
    isDisliked?: boolean
  } => {
    if (!value || typeof value !== 'object') return false
    const record = value as Record<string, unknown>
    return record.bggId !== undefined
  }

  // Initialize local prefs from sessionStorage if provided by join flow.
  useEffect(() => {
    if (prefsInitialized) return;
    try {
      const raw = sessionStorage.getItem('guestInitialPreferences');
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          const normalized = parsed
            .map((p) => (isGuestPrefSeed(p) ? p : null))
            .filter((p): p is NonNullable<typeof p> => Boolean(p))
            .map((p) => ({
              username: GUEST_USERNAME,
              bggId: Number(p.bggId),
              rank: p.rank ?? undefined,
              isTopPick: Boolean(p.isTopPick),
              isDisliked: Boolean(p.isDisliked),
              updatedAt: new Date().toISOString(),
            }))
            .filter((p) => Number.isFinite(p.bggId));
          setLocalPrefs(normalized);
        }
      }
    } catch {
      // ignore
    } finally {
      setPrefsInitialized(true);
    }
  }, [prefsInitialized]);

  // Safe defaults for display
  const games = gamesQuery ?? [];

  // Format preferences as Record<string, UserPreferenceRecord[]>
  const preferences = useMemo(() => {
    return { [GUEST_USERNAME]: localPrefs };
  }, [localPrefs]);

  // Game owners (session games are shown without local ownership)
  const gameOwners = useMemo(() => {
    return {} as Record<number, string[]>;
  }, []);

  // User ratings (guest doesn't have BGG ratings)
  const userRatings = useMemo(() => ({ [GUEST_USERNAME]: {} }), []);

  // Users array (just the guest)
  const users: UserRecord[] = useMemo(() => {
    return guestUser ? [guestUser] : [];
  }, [guestUser]);

  // Layout mode handler
  const setLayoutMode = useCallback((mode: LayoutMode) => {
    setLayoutModeState(mode);
    try { saveLayoutMode(mode); } catch { /* ignore */ }
  }, []);

  // Preference handlers
  const updatePreference = useCallback(
    async (
      username: string,
      bggId: number,
      update: { rank?: number; isTopPick?: boolean; isDisliked?: boolean }
    ) => {
      setLocalPrefs((prev) => {
        const now = new Date().toISOString();
        const userPrefs = [...prev];
        const existingIndex = userPrefs.findIndex((p) => p.bggId === bggId);

        if (existingIndex >= 0) {
          const existing = userPrefs[existingIndex];
          const normalized = normalizePreferenceUpdate(existing, update);
          userPrefs[existingIndex] = { ...existing, ...normalized, updatedAt: now };
        } else {
          const normalized = normalizePreferenceUpdate(undefined, update);
          userPrefs.push({
            username,
            bggId,
            rank: normalized.rank,
            isTopPick: normalized.isTopPick,
            isDisliked: normalized.isDisliked,
            updatedAt: now,
          });
        }
        return userPrefs;
      });
    },
    []
  );

  const reorderPreferences = useCallback((username: string, orderedBggIds: number[]) => {
    const now = new Date().toISOString();

    setLocalPrefs((prev) => {
      const existingById = new Map(prev.map((p) => [p.bggId, p]));
      const orderedSet = new Set(orderedBggIds);

      const updated = prev.map((p) => {
        const newIndex = orderedBggIds.indexOf(p.bggId);
        if (newIndex !== -1) {
          return { ...p, rank: newIndex + 1, isTopPick: false, isDisliked: false, updatedAt: now };
        }
        if (p.rank !== undefined && !orderedSet.has(p.bggId)) {
          return { ...p, rank: undefined, updatedAt: now };
        }
        return p;
      });

      const additions = orderedBggIds
        .filter((bggId) => !existingById.has(bggId))
        .map((bggId, index) => ({
          username,
          bggId,
          rank: index + 1,
          isTopPick: false,
          isDisliked: false,
          updatedAt: now,
        }));

      return [...updated, ...additions];
    });

  }, []);

  const clearPreference = useCallback(async (_username: string, bggId: number) => {
    setLocalPrefs((prev) => prev.filter((p) => p.bggId !== bggId));
  }, []);

  // Loading is true until all queries have resolved AND prefs are initialized
  const isLoading = !guestUserLoaded || !gamesLoaded || !prefsInitialized;

  return {
    guestUser: guestUser ?? null,
    games,
    gameOwners,
    preferences,
    userRatings,
    users,
    layoutMode,
    isLoading,
    setLayoutMode,
    updatePreference,
    reorderPreferences,
    clearPreference,
  };
}
