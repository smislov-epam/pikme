import { db } from '../../db';
import { GUEST_USERNAME } from '../../hooks/useGuestPreferences';
import type { SharedGamePreference } from './types';

export async function importSharedPreferencesToGuest(
  preferences: SharedGamePreference[],
  displayName: string
): Promise<{ imported: number; skipped: number }> {
  const guestName =
    displayName || localStorage.getItem('guestDisplayName') || 'Guest';

  let user = await db.users.get(GUEST_USERNAME);
  if (!user) {
    user = {
      username: GUEST_USERNAME,
      internalId: GUEST_USERNAME,
      displayName: guestName,
      isBggUser: false,
    };
    await db.users.put(user);
  }

  const now = new Date().toISOString();
  let imported = 0;
  let skipped = 0;

  for (const pref of preferences) {
    const existing = await db.userPreferences
      .where('[username+bggId]')
      .equals([GUEST_USERNAME, pref.bggId])
      .first();

    if (existing) {
      skipped++;
      continue;
    }

    await db.userPreferences.put({
      username: GUEST_USERNAME,
      bggId: pref.bggId,
      rank: pref.rank ?? undefined,
      isTopPick: pref.isTopPick ?? false,
      isDisliked: pref.isDisliked ?? false,
      updatedAt: now,
    });
    imported++;
  }

  return { imported, skipped };
}
