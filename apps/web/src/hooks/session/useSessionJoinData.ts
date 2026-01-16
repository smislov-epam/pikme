import { useEffect, useMemo, useState } from 'react';
import type { UserRecord } from '../../db/types';
import type { NamedSlotInfo, SessionPreview, SharedGamePreference } from '../../services/session/types';
import { getSessionGames, getSessionPreview, hydrateSessionGames } from '../../services/session';
import { getLocalOwner } from '../../services/db/localOwnerService';
import { hasExistingPreferences } from '../../services/db/userPreferencesService';
import { isFirebaseAvailable, initializeFirebase } from '../../services/firebase';
import { getSessionIdFromPath } from '../../services/session/joinUtils';
import type { GuestMode } from '../../components/session/GuestModeSelection';

export type JoinPageState =
  | 'loading'
  | 'preview'
  | 'loading-games'
  | 'mode-select'
  | 'preference-source'
  | 'preferences'
  | 'local-wizard'
  | 'error';

export interface SessionJoinData {
  state: JoinPageState;
  setState: (state: JoinPageState) => void;
  preview: SessionPreview | null;
  setPreview: (preview: SessionPreview | null) => void;
  displayName: string;
  setDisplayName: (name: string) => void;
  error: string | null;
  setError: (error: string | null) => void;
  isJoining: boolean;
  setIsJoining: (value: boolean) => void;
  isSelectingSource: boolean;
  setIsSelectingSource: (value: boolean) => void;
  selectedSlot: NamedSlotInfo | null;
  setSelectedSlot: (slot: NamedSlotInfo | null) => void;
  showNameInput: boolean;
  setShowNameInput: (value: boolean) => void;
  sharedPreferences: SharedGamePreference[];
  setSharedPreferences: (prefs: SharedGamePreference[]) => void;
  hasSharedPreferences: boolean;
  setHasSharedPreferences: (value: boolean) => void;
  claimedNamedSlot: boolean;
  setClaimedNamedSlot: (value: boolean) => void;
  localOwner: UserRecord | null;
  hasLocalPreferences: boolean;
  sessionId: string | null;
}

export function useSessionJoinData(): SessionJoinData {
  const [state, setState] = useState<JoinPageState>('loading');
  const [preview, setPreview] = useState<SessionPreview | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isSelectingSource, setIsSelectingSource] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<NamedSlotInfo | null>(null);
  const [showNameInput, setShowNameInput] = useState(false);
  const [sharedPreferences, setSharedPreferences] = useState<SharedGamePreference[]>([]);
  const [hasSharedPreferences, setHasSharedPreferences] = useState(false);
  const [claimedNamedSlot, setClaimedNamedSlot] = useState(false);
  const [localOwner, setLocalOwner] = useState<UserRecord | null>(null);
  const [hasLocalPreferences, setHasLocalPreferences] = useState(false);

  const sessionId = useMemo(
    () => getSessionIdFromPath(window.location.pathname).sessionId,
    []
  );

  useEffect(() => {
    async function loadPreview() {
      if (!sessionId) {
        setError('Invalid session link');
        setState('error');
        return;
      }

      if (!isFirebaseAvailable()) {
        setError('This feature requires online mode');
        setState('error');
        return;
      }

      try {
        await initializeFirebase();
      } catch {
        setError('Failed to initialize Firebase');
        setState('error');
        return;
      }

      const owner = await getLocalOwner();
      setLocalOwner(owner);
      if (owner) {
        const hasPrefs = await hasExistingPreferences(owner.username);
        setHasLocalPreferences(hasPrefs);
        setDisplayName((current) =>
          current.trim() ? current : owner.displayName || owner.username
        );
      }

      const savedSessionId = localStorage.getItem('guestSessionId');
      if (savedSessionId === sessionId) {
        setState('loading-games');
        try {
          const games = await getSessionGames(sessionId);
          try {
            const ids = games
              .map((g) => parseInt(g.gameId, 10))
              .filter((id) => !Number.isNaN(id));
            localStorage.setItem('guestSessionGameIds', JSON.stringify(ids));
          } catch {
            // ignore
          }
          await hydrateSessionGames(games, false);
          setClaimedNamedSlot(localStorage.getItem('guestClaimedNamedSlot') === 'true');

          const savedShareMode = localStorage.getItem('guestShareMode');
          if (savedShareMode === 'quick') {
            setState('preferences');
            return;
          }

          const savedMode = localStorage.getItem('guestMode') as GuestMode | null;
          if (savedMode) {
            setState(savedMode === 'guest' ? 'preferences' : 'local-wizard');
          } else {
            setState('mode-select');
          }
        } catch (err) {
          console.warn('[SessionJoinPage] Failed to reload games:', err);
          setState('mode-select');
        }
        return;
      }

      try {
        const data = await getSessionPreview(sessionId);
        setPreview(data);
        setState('preview');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load session';
        setError(message);
        setState('error');
      }
    }

    loadPreview();
  }, [sessionId]);

  return {
    state,
    setState,
    preview,
    setPreview,
    displayName,
    setDisplayName,
    error,
    setError,
    isJoining,
    setIsJoining,
    isSelectingSource,
    setIsSelectingSource,
    selectedSlot,
    setSelectedSlot,
    showNameInput,
    setShowNameInput,
    sharedPreferences,
    setSharedPreferences,
    hasSharedPreferences,
    setHasSharedPreferences,
    claimedNamedSlot,
    setClaimedNamedSlot,
    localOwner,
    hasLocalPreferences,
    sessionId,
  };
}
