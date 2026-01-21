import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { UserRecord } from '../../db/types';
import type { NamedSlotInfo, SessionPreview, SharedGamePreference } from '../../services/session/types';
import { getSessionGames, getSessionPreview, hydrateSessionGames } from '../../services/session';
import { getLocalOwner } from '../../services/db/localOwnerService';
import { hasExistingPreferences } from '../../services/db/userPreferencesService';
import { isFirebaseAvailable, initializeFirebase } from '../../services/firebase';
import type { GuestMode } from '../../components/session/GuestModeSelection';

export type JoinPageState =
  | 'loading'
  | 'preview'
  | 'loading-games'
  | 'mode-select'
  | 'preference-source'
  | 'preferences'
  | 'local-wizard'
  | 'waiting'
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
  sessionId: string | undefined;
  callerRole: 'host' | 'member' | 'guest' | null;
}

export function useSessionJoinData(): SessionJoinData {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();

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
  const [callerRole, setCallerRole] = useState<'host' | 'member' | 'guest' | null>(null);

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
            localStorage.setItem(`guestSessionGameIds:${sessionId}`, JSON.stringify(ids))
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
        setCallerRole(data.callerRole);

        // Route based on caller's role in the session
        if (data.callerRole === 'host') {
          // Host should go to wizard with this session active
          navigate(`/?session=${sessionId}`, { replace: true });
          return;
        }

        if (data.callerRole === 'member') {
          // Member has already joined - check if they're done with preferences
          // For now, take them to preferences view (they can see waiting state there)
          // Store session info for preferences view
          localStorage.setItem('guestSessionId', sessionId);
          if (data.callerParticipantId) {
            localStorage.setItem('guestParticipantId', data.callerParticipantId);
          }
          
          // Load games and go to preferences
          setState('loading-games');
          try {
            const games = await getSessionGames(sessionId);
            const ids = games
              .map((g) => parseInt(g.gameId, 10))
              .filter((id) => !Number.isNaN(id));
            localStorage.setItem('guestSessionGameIds', JSON.stringify(ids));
            localStorage.setItem(`guestSessionGameIds:${sessionId}`, JSON.stringify(ids))
            await hydrateSessionGames(games, false);
            
            // Check if member marked as ready (waiting for results)
            const isReady = localStorage.getItem('guestIsReady') === 'true';
            if (isReady) {
              setState('waiting');
            } else {
              setState('preferences');
            }
          } catch (err) {
            console.warn('[SessionJoinPage] Failed to load games for member:', err);
            setState('preferences');
          }
          return;
        }

        // Guest or unauthenticated - show preview/join flow
        setState('preview');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load session';
        setError(message);
        setState('error');
      }
    }

    loadPreview();
  }, [navigate, sessionId]);

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
    callerRole,
  };
}
