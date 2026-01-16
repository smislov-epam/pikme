import type { NamedSlotInfo } from './types';

export function getSessionIdFromPath(pathname: string): {
  sessionId: string | null;
  subPage: string | null;
} {
  const match = pathname.match(/^\/session\/([a-zA-Z0-9]+)(?:\/([a-z]+))?\/?$/);
  if (match) {
    return { sessionId: match[1], subPage: match[2] ?? null };
  }
  return { sessionId: null, subPage: null };
}

export function normalizeDisplayName(name: string): string {
  return name.trim().toLowerCase();
}

export function findMatchingNamedSlot(
  displayName: string,
  namedSlots: NamedSlotInfo[]
): NamedSlotInfo | null {
  const normalized = normalizeDisplayName(displayName);
  if (!normalized) return null;
  return (
    namedSlots.find(
      (slot) => normalizeDisplayName(slot.displayName) === normalized
    ) ?? null
  );
}
