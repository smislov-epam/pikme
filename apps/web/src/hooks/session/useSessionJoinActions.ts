import { useCallback } from 'react';
import type { GuestMode } from '../../components/session/GuestModeSelection';
import type { PreferenceSource } from '../../components/session/PreferenceSourceSelection';
import type { SessionJoinData } from './useSessionJoinData';
import type { SharedGamePreference } from '../../services/session/types';
import {
  claimSessionSlot,
  getSessionGames,
  getSharedPreferences,
  hydrateSessionGames,
} from '../../services/session';
import { trackSessionJoined } from '../../services/analytics/googleAnalytics';

export interface SessionJoinActions {
  handleJoin: (participantId?: string) => void;
  handleSomeoneElse: () => void;
  handleModeSelect: (mode: GuestMode) => void;
  handlePreferenceSourceSelect: (source: PreferenceSource) => void;
}

export function useSessionJoinActions(data: SessionJoinData): SessionJoinActions {
  const {
    displayName,
    preview,
    sessionId,
    localOwner,
    hasSharedPreferences,
    sharedPreferences,
    setClaimedNamedSlot,
    setHasSharedPreferences,
    setSharedPreferences,
    setState,
    setError,
    setIsJoining,
    setIsSelectingSource,
    setSelectedSlot,
    setShowNameInput,
  } = data;

  const handleJoin = useCallback(
    async (participantId?: string) => {
      if (!sessionId) return;

      const nameToUse = participantId
        ? preview?.namedSlots.find((s) => s.participantId === participantId)?.displayName ??
          displayName.trim()
        : displayName.trim();

      if (!nameToUse || nameToUse.length < 2) return;

      setIsJoining(true);
      setError(null);

      try {
        const { signInAnonymously } = await import('firebase/auth');
        const { getAuthInstance } = await import('../../services/firebase');
        const auth = getAuthInstance();
        if (auth) {
          await signInAnonymously(auth);
        }

        const claimResult = await claimSessionSlot(sessionId, nameToUse, participantId);
        const claimedSlot = Boolean(participantId);
        setClaimedNamedSlot(claimedSlot);

        // Track session join in analytics
        trackSessionJoined({
          sessionId,
          joinMethod: claimedSlot ? 'named_slot' : 'open_slot',
          isReturningUser: Boolean(localOwner),
        });

        // Prevent preference/rank leakage between sessions.
        // Guests should start with no local preferences unless explicitly seeded.
        sessionStorage.removeItem('guestInitialPreferences');

        localStorage.setItem('guestSessionId', sessionId);
        localStorage.setItem('guestDisplayName', nameToUse);
        localStorage.setItem('guestParticipantId', claimResult.participantId);
        localStorage.setItem('guestClaimedNamedSlot', claimedSlot ? 'true' : 'false');
        localStorage.setItem('guestShareMode', preview?.shareMode ?? 'detailed');

        setState('loading-games');
        const games = await getSessionGames(sessionId);
        // Persist the session game list so the simplified guest preferences view can load games
        // without assigning them to any local "owner".
        try {
          const ids = games
            .map((g) => parseInt(g.gameId, 10))
            .filter((id) => !Number.isNaN(id));
          localStorage.setItem('guestSessionGameIds', JSON.stringify(ids));
        } catch {
          // ignore
        }

        // Store game records in Dexie, but do NOT assign them to a virtual host owner.
        await hydrateSessionGames(games, false);

        let quickSharedPreferences: SharedGamePreference[] = [];
        if (claimResult.hasSharedPreferences) {
          try {
            const sharedPrefs = await getSharedPreferences(sessionId);
            if (sharedPrefs.hasPreferences && sharedPrefs.preferences.length > 0) {
              setSharedPreferences(sharedPrefs.preferences);
              setHasSharedPreferences(true);
              quickSharedPreferences = sharedPrefs.preferences;
            }
          } catch (prefErr) {
            console.warn('[SessionJoinPage] Failed to load shared preferences:', prefErr);
          }
        }

        const isQuickShare = preview?.shareMode === 'quick';
        if (isQuickShare) {
          localStorage.setItem('guestMode', 'guest');
          localStorage.setItem('guestPreferenceSource', 'host');
          if (quickSharedPreferences.length > 0) {
            sessionStorage.setItem('guestInitialPreferences', JSON.stringify(quickSharedPreferences));
          } else {
            sessionStorage.setItem('guestInitialPreferences', JSON.stringify([]));
          }
          setState('preferences');
          return;
        }

        // Show preference-source selection if user has local data (local owner exists).
        // This allows them to choose between "Join as Guest" and "Use My Preferences".
        // Only show mode-select for brand-new users with no local data.
        if (localOwner) {
          setState('preference-source');
        } else {
          setState('mode-select');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to join session';
        setError(message);
        setIsJoining(false);
        setState('preview');
      }
    },
    [
      displayName,
      localOwner,
      preview?.namedSlots,
      preview?.shareMode,
      sessionId,
      setClaimedNamedSlot,
      setError,
      setHasSharedPreferences,
      setIsJoining,
      setSharedPreferences,
      setState,
    ]
  );

  const handleModeSelect = useCallback(
    async (mode: GuestMode) => {
      localStorage.setItem('guestMode', mode);
      if (mode === 'guest') {
        localStorage.setItem('guestPreferenceSource', 'host');
        if (hasSharedPreferences && sharedPreferences.length > 0) {
          sessionStorage.setItem('guestInitialPreferences', JSON.stringify(sharedPreferences));
        } else {
          sessionStorage.setItem('guestInitialPreferences', JSON.stringify([]));
        }
        setState('preferences');
      } else {
        setState('local-wizard');
      }
    },
    [hasSharedPreferences, sharedPreferences, setState]
  );

  const handlePreferenceSourceSelect = useCallback(
    async (source: PreferenceSource) => {
      setIsSelectingSource(true);
      // Use the existing loading screen while we prepare preferences and (optionally)
      // sync the session games into the returning user's local collection.
      setState('loading-games');
      try {
        localStorage.setItem('guestPreferenceSource', source);

        if (source === 'host') {
          // "Join as Guest" - use simplified GuestPreferencesView
          localStorage.setItem('guestMode', 'guest');
          
          // If the user did NOT claim a reserved named slot ("I'm someone else"),
          // start with unranked games (no preloaded ranks/preferences).
          if (localStorage.getItem('guestClaimedNamedSlot') !== 'true') {
            sessionStorage.setItem('guestInitialPreferences', JSON.stringify([]));
          }

          if (hasSharedPreferences && sharedPreferences.length > 0) {
            sessionStorage.setItem('guestInitialPreferences', JSON.stringify(sharedPreferences));
          } else if (localStorage.getItem('guestClaimedNamedSlot') !== 'true') {
            sessionStorage.setItem('guestInitialPreferences', JSON.stringify([]));
          }
          setState('preferences');
        } else {
          // "Use My Preferences" - redirect to dedicated SessionGuestPage
          // REQ-106: This provides a focused session experience separate from wizard
          
          // Parse session game IDs
          const rawIds = localStorage.getItem('guestSessionGameIds');
          const parsed = rawIds ? (JSON.parse(rawIds) as unknown) : [];
          const sessionGameIds = Array.isArray(parsed)
            ? parsed
                .map((id) => (typeof id === 'number' ? id : Number(id)))
                .filter((id) => Number.isFinite(id))
            : [];
          
          // Sync session games into the returning user's local collection
          try {
            if (localOwner && sessionGameIds.length > 0) {
              const { addGameToUser } = await import('../../services/db/userGamesService');
              for (const bggId of sessionGameIds) {
                await addGameToUser(localOwner.username, bggId);
              }
              console.log(`[SessionJoinPage] Synced ${sessionGameIds.length} session games to ${localOwner.username}`);
            }
          } catch (syncErr) {
            console.warn('[SessionJoinPage] Failed to sync session games into local collection:', syncErr);
          }

          // Set session context for SessionGuestPage
          const effectiveSessionId = sessionId ?? localStorage.getItem('guestSessionId');
          if (effectiveSessionId) {
            localStorage.setItem('activeSessionId', effectiveSessionId);
            try {
              const stored = localStorage.getItem('activeSessionIds');
              const parsed = stored ? (JSON.parse(stored) as unknown) : [];
              const ids = Array.isArray(parsed)
                ? parsed.filter((id) => typeof id === 'string')
                : [];
              if (!ids.includes(effectiveSessionId)) ids.push(effectiveSessionId);
              localStorage.setItem('activeSessionIds', JSON.stringify(ids));
            } catch {
              localStorage.setItem('activeSessionIds', JSON.stringify([effectiveSessionId]));
            }
          }
          
          // Redirect to dedicated session guest page
          window.location.href = `/session/${effectiveSessionId}/preferences`;
          return; // Don't call setIsSelectingSource since we're redirecting
        }
      } catch (err) {
        console.warn('[SessionJoinPage] Failed to select preference source:', err);
        setError(err instanceof Error ? err.message : 'Failed to prepare preferences');
        setState('preference-source');
      } finally {
        setIsSelectingSource(false);
      }
    },
    [hasSharedPreferences, localOwner, sessionId, sharedPreferences, setError, setIsSelectingSource, setState]
  );

  const handleSomeoneElse = useCallback(() => {
    setSelectedSlot(null);
    setShowNameInput(true);
  }, [setSelectedSlot, setShowNameInput]);

  return {
    handleJoin,
    handleSomeoneElse,
    handleModeSelect,
    handlePreferenceSourceSelect,
  };
}
