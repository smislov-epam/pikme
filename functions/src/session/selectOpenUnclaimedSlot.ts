import type { Participant } from './types.js';
import type { DocumentReference } from 'firebase-admin/firestore';

type ParticipantDocLike = {
  id: string;
  ref: DocumentReference;
  data: () => Participant;
};

/**
 * Picks a participant doc that is BOTH unclaimed and slotType='open'.
 * Returns null when no suitable slot exists.
 */
export function selectOpenUnclaimedSlotDoc(
  docs: ParticipantDocLike[]
): ParticipantDocLike | null {
  return (
    docs.find((doc) => {
      const participant = doc.data();
      return participant.claimed === false && participant.slotType === 'open';
    }) ?? null
  );
}
