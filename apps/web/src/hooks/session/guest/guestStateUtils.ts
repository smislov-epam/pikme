/**
 * Guest session state utilities.
 */
import type { UserPreferenceRecord } from '../../../db/types';

const GUEST_READY_KEY = 'guestIsReady';

export function getGuestReadyState(sessionId: string): boolean {
  try {
    const stored = localStorage.getItem(GUEST_READY_KEY);
    if (!stored) return false;
    const data = JSON.parse(stored) as { sessionId: string; ready: boolean };
    return data.sessionId === sessionId && data.ready === true;
  } catch {
    return false;
  }
}

export function setGuestReadyState(sessionId: string, ready: boolean): void {
  localStorage.setItem(GUEST_READY_KEY, JSON.stringify({ sessionId, ready }));
}

export function createPrefsSnapshot(prefs: UserPreferenceRecord[]): string {
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
