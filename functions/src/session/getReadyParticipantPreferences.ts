/**
 * Get Ready Participant Preferences Cloud Function (REQ-106)
 *
 * Allows any session member (including guests) to view preferences
 * of other participants who have marked themselves as ready.
 * This enables guests to see what others have selected.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import type { Session, SharedGamePreference } from './types.js';

export interface GetReadyParticipantPreferencesRequest {
  sessionId: string;
}

export interface ParticipantPreferencesInfo {
  uid: string;
  displayName: string;
  role: 'host' | 'guest';
  preferences: SharedGamePreference[];
}

export interface GetReadyParticipantPreferencesResponse {
  ok: true;
  participants: ParticipantPreferencesInfo[];
}

/**
 * Get preferences of all ready participants in a session.
 * Available to any authenticated session member.
 */
export const getReadyParticipantPreferences = onCall(async (request) => {
  const { auth, data } = request;

  // 1. Require authentication
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const db = getFirestore();
  const uid = auth.uid;
  const req = data as GetReadyParticipantPreferencesRequest;

  // 2. Validate request
  if (!req.sessionId?.trim()) {
    throw new HttpsError('invalid-argument', 'sessionId is required');
  }

  const sessionId = req.sessionId.trim();

  // 3. Verify session exists
  const sessionRef = db.collection('sessions').doc(sessionId);
  const sessionDoc = await sessionRef.get();

  if (!sessionDoc.exists) {
    throw new HttpsError('not-found', 'Session not found');
  }

  const session = sessionDoc.data() as Session;

  // 4. Verify user is a member of the session
  const memberRef = sessionRef.collection('members').doc(uid);
  const memberDoc = await memberRef.get();
  
  const isHost = session.createdByUid === uid;
  const isMember = memberDoc.exists;

  if (!isHost && !isMember) {
    throw new HttpsError('permission-denied', 'You are not a member of this session');
  }

  // 5. Get all members who are ready
  const membersSnapshot = await sessionRef.collection('members').get();
  const readyMembers = new Map<string, { displayName: string; role: 'host' | 'guest'; ready: boolean; participantId?: string }>();
  
  membersSnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.ready) {
      readyMembers.set(doc.id, {
        displayName: data.displayName,
        role: data.role,
        ready: true,
        participantId: data.participantId,
      });
    }
  });

  // 6. Also get sharedPreferences (local/named participants including host)
  // These are keyed by participantId (e.g., "host-xxx", "named-1")
  const sharedPrefsSnapshot = await sessionRef.collection('sharedPreferences').get();
  const sharedPrefsByParticipantId = new Map<string, { displayName: string; preferences: SharedGamePreference[] }>();
  
  sharedPrefsSnapshot.forEach((doc) => {
    const data = doc.data();
    sharedPrefsByParticipantId.set(doc.id, {
      displayName: data.displayName || 'Unknown',
      preferences: data.preferences || [],
    });
  });

  // 7. Get guestPreferences to check who has explicitly synced
  // This includes host (uid), local users (uid_username), and online guests (their uid)
  const guestPrefsSnapshot = await sessionRef.collection('guestPreferences').get();
  const guestPrefsDocIds = new Set<string>();
  const preferencesMap = new Map<string, SharedGamePreference[]>();
  
  guestPrefsSnapshot.forEach((doc) => {
    const data = doc.data();
    guestPrefsDocIds.add(doc.id);
    // Map by uid for ready members lookup
    if (data.uid) {
      preferencesMap.set(data.uid, data.preferences || []);
    }
    // Also map by participantId for local users
    if (data.participantId) {
      preferencesMap.set(data.participantId, data.preferences || []);
    }
  });

  // Check if host has explicitly synced their preferences to guestPreferences
  // Host's guestPreferences doc ID is just their uid (no forLocalUser)
  const hostHasExplicitlySynced = guestPrefsDocIds.has(session.createdByUid);

  // 8. Build response (exclude current user from the list)
  const participants: ParticipantPreferencesInfo[] = [];
  
  readyMembers.forEach((member, memberId) => {
    if (memberId !== uid) { // Exclude self
      // First check guestPreferences (online users)
      let prefs = preferencesMap.get(memberId);
      
      // If not found, check sharedPreferences by participantId (local/named users)
      if (!prefs && member.participantId) {
        const shared = sharedPrefsByParticipantId.get(member.participantId);
        if (shared) {
          prefs = shared.preferences;
        }
      }
      
      participants.push({
        uid: memberId,
        displayName: member.displayName,
        role: member.role,
        preferences: prefs || [],
      });
    }
  });
  
  // 9. Also include local/named participants from sharedPreferences who aren't in members yet
  // These are preferences shared at session creation but the participant hasn't claimed their slot
  sharedPrefsByParticipantId.forEach((shared, participantId) => {
    // Check if this is the host's participant ID
    const isHostParticipant = participantId.startsWith('host-');
    
    // IMPORTANT: Skip host's initial preferences unless host has explicitly synced
    // This prevents showing host prefs from session creation before host marks ready
    if (isHostParticipant && !hostHasExplicitlySynced) {
      return; // Skip host's sharedPreferences entry
    }
    
    // Check if any ready member has this participantId (already included in step 8)
    let alreadyIncluded = false;
    readyMembers.forEach((member) => {
      if (member.participantId === participantId) {
        alreadyIncluded = true;
      }
    });
    
    // Include shared preferences from local/named users
    // Skip self (if caller's participantId matches)
    if (!alreadyIncluded && shared.preferences.length > 0) {
      participants.push({
        uid: participantId, // Use participantId as identifier for local users
        displayName: shared.displayName,
        role: isHostParticipant ? 'host' : 'guest', // Use 'host' role for host participants
        preferences: shared.preferences,
      });
    }
  });

  console.log(
    `[getReadyParticipantPreferences] User ${uid} fetched ${participants.length} ready participants' preferences for session ${sessionId}`
  );

  const response: GetReadyParticipantPreferencesResponse = {
    ok: true,
    participants,
  };

  return response;
});
