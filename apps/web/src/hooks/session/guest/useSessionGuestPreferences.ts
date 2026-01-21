/**
 * Preference mutation helpers for guest session state.
 */
import { useCallback } from 'react';
import { db } from '../../../db';
import { normalizePreferenceUpdate } from '../../../services/preferences/preferenceRules';

export function useSessionGuestPreferences() {
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

  const reorderPreferences = useCallback(async (username: string, orderedBggIds: number[]) => {
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
            updatedAt: now,
          });
        }
      }
    });
  }, []);

  const clearPreference = useCallback(async (username: string, bggId: number) => {
    await db.userPreferences.where('[username+bggId]').equals([username, bggId]).delete();
  }, []);

  return { updatePreference, reorderPreferences, clearPreference };
}
