/**
 * useSessionGuestState (REQ-106)
 * Manages guest session state for the "Use My Preferences" path using composed helpers.
 */
import { useCallback, useMemo, useState } from 'react';
import type { GameRecord, UserRecord, UserPreferenceRecord } from '../../db/types';
import { loadLayoutMode, saveLayoutMode, type LayoutMode } from '../../services/storage/uiPreferences';
import { setGuestReady, submitGuestPreferences } from '../../services/session';
import { createPrefsSnapshot, getGuestReadyState, setGuestReadyState } from './guest/guestStateUtils';
import { useSessionGuestData, type SessionFilters } from './guest/useSessionGuestData';
import { useSessionGuestPreferences } from './guest/useSessionGuestPreferences';

export interface SessionGuestStateResult {
  localOwner: UserRecord | null;
  games: GameRecord[];
  gameOwners: Record<number, string[]>;
  preferences: Record<string, UserPreferenceRecord[]>;
  userRatings: Record<string, Record<number, number | undefined>>;
  users: UserRecord[];
  sessionFilters: SessionFilters | null;
  layoutMode: LayoutMode;
  isLoading: boolean;
  isReady: boolean;
  hasChanges: boolean;
  error: string | null;
  setLayoutMode: (mode: LayoutMode) => void;
  updatePreference: (
    username: string,
    bggId: number,
    update: { rank?: number; isTopPick?: boolean; isDisliked?: boolean }
  ) => Promise<void>;
  reorderPreferences: (username: string, orderedBggIds: number[]) => void;
  clearPreference: (username: string, bggId: number) => Promise<void>;
  markReady: () => Promise<void>;
}

export function useSessionGuestState(sessionId: string): SessionGuestStateResult {
  const [layoutMode, setLayoutModeState] = useState<LayoutMode>(() => {
    try {
      return loadLayoutMode();
    } catch {
      return 'standard';
    }
  });
  const [isReady, setIsReady] = useState(() => getGuestReadyState(sessionId));
  const [isMarkingReady, setIsMarkingReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedSnapshot, setSubmittedSnapshot] = useState<string | null>(null);

  const {
    localOwner,
    games,
    gameOwners,
    preferences,
    userRatings,
    users,
    sessionFilters,
    isLoading,
  } = useSessionGuestData(sessionId);

  const { updatePreference, reorderPreferences, clearPreference } = useSessionGuestPreferences();

  const setLayoutMode = useCallback((mode: LayoutMode) => {
    setLayoutModeState(mode);
    try {
      saveLayoutMode(mode);
    } catch {
      /* ignore */
    }
  }, []);

  const markReady = useCallback(async () => {
    if (!localOwner) return;

    setIsMarkingReady(true);
    setError(null);

    try {
      const currentPrefs = preferences[localOwner.username] ?? [];

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

      setSubmittedSnapshot(createPrefsSnapshot(currentPrefs));
      setGuestReadyState(sessionId, true);
      setIsReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as ready');
    } finally {
      setIsMarkingReady(false);
    }
  }, [localOwner, preferences, sessionId]);

  const hasChanges = useMemo(() => {
    if (!isReady || !submittedSnapshot) return false;
    const currentSnapshot = createPrefsSnapshot(preferences[localOwner?.username ?? ''] ?? []);
    return currentSnapshot !== submittedSnapshot;
  }, [isReady, localOwner?.username, preferences, submittedSnapshot]);

  return {
    localOwner,
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
