/* eslint-disable max-lines */
// This hook manages all wizard state - kept in one file for cohesion
import { useState, useCallback, useEffect, useMemo } from 'react'
import type { GameRecord, UserRecord, UserPreferenceRecord, SavedNightRecord } from '../db/types'
import * as dbService from '../services/db'
import * as bggService from '../services/bgg/bggService'
import { BggAuthError, BggRateLimitError, BggUserNotFoundError } from '../services/bgg/bggClient'
import type { BggSearchResult } from '../services/bgg/types'
import type { WizardFilters } from '../store/wizardTypes'
import { applyGameFilters } from '../services/filtering/applyGameFilters'
import { loadWizardState, saveWizardState, clearWizardState } from '../services/storage/wizardStateStorage'
import { loadLayoutMode, saveLayoutMode, type LayoutMode } from '../services/storage/uiPreferences'
import { promotePickInSortedGames } from '../services/recommendation/promotePick'
import { findReusableNight } from '../services/savedNights/findReusableNight'
import { normalizePreferenceUpdate } from '../services/preferences/preferenceRules'

export interface WizardState {
  // Step 1: Players
  users: UserRecord[]
  games: GameRecord[] // Full collection of all games
  sessionGameIds: number[] // Games included in current session (subset of games)
  excludedBggIds: number[] // Games excluded from current session candidate pool
  gameOwners: Record<number, string[]> // bggId -> usernames who own the game
  existingLocalUsers: UserRecord[] // All local users in DB for autocomplete
  isLoadingUser: boolean
  userError: string | null
  needsApiKey: boolean
  pendingBggUserNotFoundUsername: string | null
  pendingReuseGamesNight: { id: number; name: string; gameCount: number } | null

  // Step 2: Filters
  filters: WizardFilters
  sessionGames: GameRecord[] // Games in session (before filtering)
  filteredGames: GameRecord[] // Session games after applying filters

  // Step 3: Preferences
  preferences: Record<string, UserPreferenceRecord[]>
  userRatings: Record<string, Record<number, number | undefined>>

  // Step 4: Results
  recommendation: {
    topPick: { game: GameRecord; score: number; matchReasons: string[] } | null
    alternatives: Array<{ game: GameRecord; score: number; matchReasons: string[] }>
    vetoed: Array<{ game: GameRecord; vetoedBy: string[] }>
  }

  // UI preferences
  layoutMode: LayoutMode
}

export interface WizardActions {
  // Players
  addBggUser: (username: string) => Promise<void>
  confirmAddBggUserAnyway: () => Promise<void>
  cancelAddBggUserAnyway: () => void
  confirmReuseGamesFromNight: () => Promise<void>
  dismissReuseGamesPrompt: () => void
  addLocalUser: (name: string, isOrganizer?: boolean) => Promise<void>
  removeUser: (username: string) => void
  deleteUserPermanently: (username: string) => Promise<void>
  setOrganizer: (username: string) => Promise<void>
  searchGame: (query: string) => Promise<BggSearchResult[]>
  addGameToUser: (username: string, bggId: number) => Promise<void>
  removeGameFromUser: (username: string, bggId: number) => Promise<void>
  // Session game management
  addGameToSession: (bggId: number) => void
  removeGameFromSession: (bggId: number) => void
  excludeGameFromSession: (bggId: number) => void
  undoExcludeGameFromSession: (bggId: number) => void
  addOwnerToGame: (username: string, bggId: number) => Promise<void>
  fetchGameInfo: (url: string) => Promise<{
    bggId: number; name?: string; thumbnail?: string; minPlayers?: number; maxPlayers?: number
    playingTimeMinutes?: number; minPlayTimeMinutes?: number; maxPlayTimeMinutes?: number
    minAge?: number; averageRating?: number; weight?: number
    categories?: string[]; mechanics?: string[]; description?: string
  }>
  addGameManually: (usernames: string[], game: {
    bggId: number; name: string; minPlayers?: number; maxPlayers?: number
    playingTimeMinutes?: number; minPlayTimeMinutes?: number; maxPlayTimeMinutes?: number
    minAge?: number; thumbnail?: string; averageRating?: number
    weight?: number; categories?: string[]; mechanics?: string[]; description?: string
  }) => Promise<void>
  updateGame: (game: GameRecord) => Promise<void>
  refreshGameFromBgg: (bggId: number, options: { keepNotes: boolean }) => Promise<GameRecord>

  // Filters
  setPlayerCount: (count: number) => void
  setTimeRange: (range: { min: number; max: number }) => void
  setMode: (mode: 'coop' | 'competitive' | 'any') => void
  setExcludeLowRated: (threshold: number | null) => void
  setAgeRange: (range: { min: number; max: number }) => void
  setComplexityRange: (range: { min: number; max: number }) => void
  setRatingRange: (range: { min: number; max: number }) => void

  // Preferences
  updatePreference: (username: string, bggId: number, update: { rank?: number; isTopPick?: boolean; isDisliked?: boolean }) => void
  clearPreference: (username: string, bggId: number) => void
  reorderPreferences: (username: string, orderedBggIds: number[]) => void
  autoSortByRating: (username: string) => void
  markRestNeutral: (username: string) => void

  // Results
  computeRecommendation: () => void
  promoteAlternativeToTopPick: (bggId: number) => void
  saveNight: (name: string, description?: string) => Promise<void>

  // Saved nights
  savedNights: SavedNightRecord[]
  loadSavedNights: () => Promise<void>
  loadSavedNight: (id: number) => Promise<void>

  // Reset
  reset: () => void

  // Notifications
  clearUserError: () => void

  // API Key
  clearNeedsApiKey: () => void

  // UI preferences
  setLayoutMode: (mode: LayoutMode) => void
}

const DEFAULT_FILTERS: WizardFilters = {
  playerCount: 4,
  timeRange: { min: 0, max: 300 },
  mode: 'any',
  excludeLowRatedThreshold: null,
  ageRange: { min: 0, max: 21 },
  complexityRange: { min: 1, max: 5 },
  ratingRange: { min: 0, max: 10 },
}

// Coop mechanics for filtering
const COOP_MECHANICS = ['Cooperative Game', 'Solo / Solitaire Game', 'Team-Based Game']

function isCoopGame(mechanics?: string[]): boolean {
  if (!mechanics) return false
  return mechanics.some((m) => COOP_MECHANICS.includes(m))
}

type PersistedWizardStateV1 = {
  version: 1
  usernames: string[]
  sessionGameIds: number[]
  excludedBggIds: number[]
  filters: WizardFilters
}

function isPersistedWizardStateV1(x: unknown): x is PersistedWizardStateV1 {
  if (!x || typeof x !== 'object') return false
  const obj = x as Record<string, unknown>
  return (
    obj.version === 1 &&
    Array.isArray(obj.usernames) &&
    Array.isArray(obj.sessionGameIds) &&
    Array.isArray(obj.excludedBggIds) &&
    typeof obj.filters === 'object' &&
    obj.filters !== null
  )
}

export function useWizardState(): WizardState & WizardActions {
  // State
  const [users, setUsers] = useState<UserRecord[]>([])
  const [games, setGames] = useState<GameRecord[]>([]) // Full collection
  const [sessionGameIds, setSessionGameIds] = useState<number[]>([]) // Games in current session
  const [excludedBggIds, setExcludedBggIds] = useState<number[]>([])
  const [gameOwners, setGameOwners] = useState<Record<number, string[]>>({})
  const [existingLocalUsers, setExistingLocalUsers] = useState<UserRecord[]>([])
  const [isLoadingUser, setIsLoadingUser] = useState(false)
  const [userError, setUserError] = useState<string | null>(null)
  // API key is optional - users can add games via BGG links instead
  const [needsApiKey, setNeedsApiKey] = useState(false)
  const [pendingBggUserNotFoundUsername, setPendingBggUserNotFoundUsername] = useState<string | null>(null)
  const [pendingReuseGamesNightId, setPendingReuseGamesNightId] = useState<number | null>(null)
  const [dismissedReuseGamesNightId, setDismissedReuseGamesNightId] = useState<number | null>(null)
  const [filters, setFilters] = useState<WizardFilters>(DEFAULT_FILTERS)
  const [preferences, setPreferences] = useState<Record<string, UserPreferenceRecord[]>>({})
  const [userRatings, setUserRatings] = useState<Record<string, Record<number, number | undefined>>>({})
  const [savedNights, setSavedNights] = useState<SavedNightRecord[]>([])
  const [promotedPickBggId, setPromotedPickBggId] = useState<number | null>(null)
  const [layoutMode, setLayoutModeState] = useState<LayoutMode>(() => {
    try {
      return loadLayoutMode()
    } catch {
      return 'standard'
    }
  })

  const clearUserError = useCallback(() => {
    setUserError(null)
  }, [])

  const setLayoutMode = useCallback((mode: LayoutMode) => {
    setLayoutModeState(mode)
    try {
      saveLayoutMode(mode)
    } catch {
      // ignore (e.g. strict privacy settings)
    }
  }, [])

  // Load existing users and saved nights on mount (but don't auto-select players)
  useEffect(() => {
    const loadState = async () => {
      try {
        const persisted = await loadWizardState<unknown>()
        if (isPersistedWizardStateV1(persisted)) {
          setFilters(persisted.filters)
          setSessionGameIds(persisted.sessionGameIds)
          setExcludedBggIds(persisted.excludedBggIds)

          if (persisted.usernames.length > 0) {
            const loadedUsers: UserRecord[] = []
            for (const username of persisted.usernames) {
              let user = await dbService.getUser(username)
              if (!user) {
                user = await dbService.createLocalUser(username, username, loadedUsers.length === 0)
              }
              loadedUsers.push(user)
            }
            setUsers(loadedUsers)

            const loadedGames = await dbService.getGamesForUsers(persisted.usernames)
            setGames(loadedGames)

            const owners = await dbService.getGameOwners(loadedGames.map((g) => g.bggId))
            setGameOwners(owners)

            const prefsMap: Record<string, UserPreferenceRecord[]> = {}
            const ratingsMap: Record<string, Record<number, number | undefined>> = {}
            for (const user of loadedUsers) {
              prefsMap[user.username] = await dbService.getUserPreferences(user.username)
              const userGameRecords = await dbService.getUserGames(user.username)
              ratingsMap[user.username] = {}
              for (const ug of userGameRecords) {
                ratingsMap[user.username][ug.bggId] = ug.rating
              }
            }
            setPreferences(prefsMap)
            setUserRatings(ratingsMap)
          }
        }

        // Load all local users for autocomplete (not into active session)
        const localUsers = await dbService.getLocalUsers()
        setExistingLocalUsers(localUsers)

        // Load saved nights for the dropdown
        const nights = await dbService.getSavedNights()
        setSavedNights(nights)

        // Don't auto-load users into session - let user explicitly add them
      } catch (err) {
        console.error('Failed to load wizard state:', err)
      }
    }
    loadState()
  }, [])

  // Persist the wizard state relevant to session continuity (debounced).
  useEffect(() => {
    const handle = window.setTimeout(() => {
      const payload: PersistedWizardStateV1 = {
        version: 1,
        usernames: users.map((u) => u.username),
        sessionGameIds,
        excludedBggIds,
        filters,
      }
      void saveWizardState(payload)
    }, 300)

    return () => window.clearTimeout(handle)
  }, [excludedBggIds, filters, sessionGameIds, users])

  // Session games (games included in current session, before filtering)
  const sessionGames = useMemo(() => {
    const sessionSet = new Set(sessionGameIds)
    const excludedSet = new Set(excludedBggIds)
    return games.filter((g) => sessionSet.has(g.bggId) && !excludedSet.has(g.bggId))
  }, [games, excludedBggIds, sessionGameIds])

  const organizerUsername = useMemo(() => users.find((u) => u.isOrganizer)?.username ?? null, [users])

  const pendingReuseGamesNight = useMemo(() => {
    if (!pendingReuseGamesNightId) return null
    const match = savedNights.find((n) => n.id === pendingReuseGamesNightId)
    if (!match) return null
    return {
      id: pendingReuseGamesNightId,
      name: match.data.name,
      gameCount: (match.data.gameIds ?? []).length,
    }
  }, [pendingReuseGamesNightId, savedNights])

  useEffect(() => {
    if (sessionGameIds.length > 0) return
    const match = findReusableNight({
      savedNights,
      organizerUsername,
      playerCount: users.length,
    })

    if (!match) {
      setPendingReuseGamesNightId(null)
      return
    }

    if (!match.id) {
      setPendingReuseGamesNightId(null)
      return
    }

    if (dismissedReuseGamesNightId === match.id) return
    setPendingReuseGamesNightId(match.id)
  }, [dismissedReuseGamesNightId, organizerUsername, savedNights, sessionGameIds.length, users.length])

  // Filtered games (session games after applying filters)
  const filteredGames = useMemo(() => {
    return applyGameFilters(sessionGames, filters, userRatings)
  }, [sessionGames, filters, userRatings])

  // Compute recommendation (Borda count)
  const recommendation = useMemo(() => {
    if (filteredGames.length === 0 || users.length === 0) {
      return { topPick: null, alternatives: [], vetoed: [] }
    }

    // Veto: any user can exclude a game by marking it Disliked.
    // Only consider games that are otherwise eligible (filteredGames).
    const eligibleIds = new Set(filteredGames.map((g) => g.bggId))
    const vetoedByGame: Record<number, string[]> = {}

    for (const username of Object.keys(preferences)) {
      const userPrefs = preferences[username] ?? []
      for (const pref of userPrefs) {
        if (!pref.isDisliked) continue
        if (!eligibleIds.has(pref.bggId)) continue
        ;(vetoedByGame[pref.bggId] ||= []).push(username)
      }
    }

    const vetoedIds = new Set(Object.keys(vetoedByGame).map((k) => Number(k)))
    const vetoed = filteredGames
      .filter((g) => vetoedIds.has(g.bggId))
      .map((game) => ({ game, vetoedBy: vetoedByGame[game.bggId] ?? [] }))

    const eligibleGames = filteredGames.filter((g) => !vetoedIds.has(g.bggId))
    if (eligibleGames.length === 0) {
      return { topPick: null, alternatives: [], vetoed }
    }

    // Calculate scores using Borda count
    const scores: Record<number, number> = {}
    const topPickBonus = 2

    for (const game of eligibleGames) {
      scores[game.bggId] = 0
    }

    for (const username of Object.keys(preferences)) {
      const userPrefs = preferences[username] ?? []
      const rankedPrefs = userPrefs
        .filter((p) => scores[p.bggId] !== undefined)
        .filter((p) => p.rank !== undefined || p.isTopPick)
        .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))

      const m = rankedPrefs.length

      rankedPrefs.forEach((pref, index) => {
        if (scores[pref.bggId] !== undefined) {
          // Borda: m-1 points for rank 1, down to 0 for rank m
          scores[pref.bggId] += m - 1 - index

          // Bonus for top picks
          if (pref.isTopPick) {
            scores[pref.bggId] += topPickBonus
          }
        }
      })
    }

    // Sort by score
    const sortedGames = eligibleGames
      .map((game) => ({
        game,
        score: scores[game.bggId] ?? 0,
        matchReasons: getMatchReasons(game, filters),
      }))
      .sort((a, b) => b.score - a.score)

    const promotedSortedGames = promotePickInSortedGames(sortedGames, promotedPickBggId)

    return {
      topPick: promotedSortedGames[0] ?? null,
      alternatives: promotedSortedGames.slice(1, 6),
      vetoed,
    }
  }, [filteredGames, preferences, users, filters, promotedPickBggId])

  // Actions
  const addBggUser = useCallback(async (username: string) => {
    setIsLoadingUser(true)
    setUserError(null)

    try {
      const { games: newGames, user } = await bggService.syncUserCollectionToDb(username)

      setUsers((prev) => {
        if (prev.some((u) => u.username === username)) return prev
        return [...prev, user]
      })

      setGames((prev) => {
        const existing = new Set(prev.map((g) => g.bggId))
        const unique = newGames.filter((g) => !existing.has(g.bggId))
        return [...prev, ...unique]
      })

      // Load ratings
      const userGameRecords = await dbService.getUserGames(username)
      setUserRatings((prev) => ({
        ...prev,
        [username]: Object.fromEntries(userGameRecords.map((ug) => [ug.bggId, ug.rating])),
      }))

      // Initialize empty preferences
      setPreferences((prev) => ({
        ...prev,
        [username]: [],
      }))
    } catch (err) {
      if (err instanceof BggUserNotFoundError) {
        setPendingBggUserNotFoundUsername(username)
        return
      }
      if (err instanceof BggAuthError || err instanceof BggRateLimitError) {
        // Only prompt for API key if there's an auth/rate limit issue
        setNeedsApiKey(true)
      }
      setUserError(err instanceof Error ? err.message : 'Failed to import BGG collection')
    } finally {
      setIsLoadingUser(false)
    }
  }, [])

  const confirmAddBggUserAnyway = useCallback(async () => {
    const username = pendingBggUserNotFoundUsername
    if (!username) return

    setIsLoadingUser(true)
    setUserError(null)

    try {
      const user = await dbService.createBggUser(username)

      setUsers((prev) => {
        if (prev.some((u) => u.username === username)) return prev
        return [...prev, user]
      })

      setPreferences((prev) => ({
        ...prev,
        [username]: prev[username] ?? [],
      }))

      setUserRatings((prev) => ({
        ...prev,
        [username]: prev[username] ?? {},
      }))
    } catch (err) {
      setUserError(err instanceof Error ? err.message : 'Failed to add BGG user')
    } finally {
      setIsLoadingUser(false)
      setPendingBggUserNotFoundUsername(null)
    }
  }, [pendingBggUserNotFoundUsername])

  const cancelAddBggUserAnyway = useCallback(() => {
    setPendingBggUserNotFoundUsername(null)
  }, [])

  const confirmReuseGamesFromNight = useCallback(async () => {
    const nightId = pendingReuseGamesNightId
    if (!nightId) return

    const night = savedNights.find((n) => n.id === nightId)
    const gameIds = night?.data.gameIds ?? []
    if (gameIds.length === 0) {
      setPendingReuseGamesNightId(null)
      return
    }

    try {
      const loadedGames = await dbService.getGames(gameIds)
      setGames((prev) => {
        const existing = new Set(prev.map((g) => g.bggId))
        const additions = loadedGames.filter((g) => !existing.has(g.bggId))
        return additions.length > 0 ? [...prev, ...additions] : prev
      })
      setSessionGameIds(gameIds)
      setExcludedBggIds([])

      const owners = await dbService.getGameOwners(gameIds)
      setGameOwners((prev) => ({ ...prev, ...owners }))
    } catch (err) {
      setUserError(err instanceof Error ? err.message : 'Failed to load games from previous night')
    } finally {
      setPendingReuseGamesNightId(null)
    }
  }, [pendingReuseGamesNightId, savedNights])

  const dismissReuseGamesPrompt = useCallback(() => {
    setDismissedReuseGamesNightId(pendingReuseGamesNightId)
    setPendingReuseGamesNightId(null)
  }, [pendingReuseGamesNightId])

  const addLocalUser = useCallback(async (name: string, isOrganizer?: boolean) => {
    try {
      // Check if user already exists in DB
      const existingUser = await dbService.getUser(name)
      let user: UserRecord
      
      if (existingUser) {
        // User exists - add them to session with their existing data
        user = existingUser
        // If this should be organizer (first user in session), update them
        if (isOrganizer && !existingUser.isOrganizer) {
          await dbService.setUserAsOrganizer(name)
          user = { ...existingUser, isOrganizer: true }
        }
      } else {
        // New user - create them
        user = await dbService.createLocalUser(name, name, isOrganizer)
        // Add to existing local users
        setExistingLocalUsers((prev) => [...prev, user])
      }
      
      setUsers((prev) => [...prev, user])
      
      // Load their preferences and ratings if they exist
      const userPrefs = await dbService.getUserPreferences(name)
      const userGameRecords = await dbService.getUserGames(name)
      const ratings: Record<number, number | undefined> = {}
      for (const ug of userGameRecords) {
        ratings[ug.bggId] = ug.rating
      }
      
      setPreferences((prev) => ({ ...prev, [name]: userPrefs }))
      setUserRatings((prev) => ({ ...prev, [name]: ratings }))
      
      // Load their games into the session
      if (userGameRecords.length > 0) {
        const userGames = await dbService.getGamesForUsers([name])
        setGames((prev) => {
          const existingIds = new Set(prev.map(g => g.bggId))
          const newGames = userGames.filter(g => !existingIds.has(g.bggId))
          return [...prev, ...newGames]
        })
        // Update game owners
        const bggIds = userGames.map(g => g.bggId)
        const owners = await dbService.getGameOwners(bggIds)
        setGameOwners((prev) => ({ ...prev, ...owners }))
      }
    } catch (err) {
      setUserError(err instanceof Error ? err.message : 'Failed to add user')
    }
  }, [])

  const setOrganizer = useCallback(async (username: string) => {
    try {
      await dbService.setUserAsOrganizer(username)
      setUsers((prev) =>
        prev.map((u) => ({ ...u, isOrganizer: u.username === username }))
      )
    } catch (err) {
      setUserError(err instanceof Error ? err.message : 'Failed to set organizer')
    }
  }, [])

  const removeUser = useCallback((username: string) => {
    setUsers((prev) => prev.filter((u) => u.username !== username))
    setPreferences((prev) => {
      const next = { ...prev }
      delete next[username]
      return next
    })
    setUserRatings((prev) => {
      const next = { ...prev }
      delete next[username]
      return next
    })
    // Remove from game owners
    setGameOwners((prev) => {
      const next: Record<number, string[]> = {}
      for (const [bggId, owners] of Object.entries(prev)) {
        const filtered = owners.filter((u) => u !== username)
        if (filtered.length > 0) {
          next[Number(bggId)] = filtered
        }
      }
      return next
    })
    
    // Note: We don't delete from DB here to preserve data for future sessions
  }, [])

  const deleteUserPermanently = useCallback(async (username: string) => {
    try {
      // Delete from DB
      await dbService.deleteUser(username)
      // Remove from state
      removeUser(username)
    } catch (err) {
      setUserError(err instanceof Error ? err.message : 'Failed to delete user')
    }
  }, [removeUser])

  const searchGame = useCallback(async (query: string): Promise<BggSearchResult[]> => {
    try {
      return await bggService.searchGames(query)
    } catch (err) {
      if (err instanceof BggAuthError || err instanceof BggRateLimitError) {
        setNeedsApiKey(true)
      }
      setUserError(err instanceof Error ? err.message : 'Failed to search games')
      return []
    }
  }, [])

  const addGameToUser = useCallback(async (username: string, bggId: number) => {
    try {
      const game = await bggService.addGameToUserCollection(username, bggId)
      setGames((prev) => {
        if (prev.some((g) => g.bggId === bggId)) return prev
        return [...prev, game]
      })
      // Add to session automatically when adding a game
      setSessionGameIds((prev) => prev.includes(bggId) ? prev : [...prev, bggId])
      // Update game owners
      setGameOwners((prev) => ({
        ...prev,
        [bggId]: [...(prev[bggId] ?? []).filter(u => u !== username), username],
      }))
    } catch (err) {
      if (err instanceof BggAuthError || err instanceof BggRateLimitError) {
        setNeedsApiKey(true)
      }
      setUserError(err instanceof Error ? err.message : 'Failed to add game')
    }
  }, [])

  const removeGameFromUser = useCallback(async (username: string, bggId: number) => {
    try {
      await dbService.removeGameFromUser(username, bggId)
      // Update game owners - game stays in session even if no owners
      setGameOwners((prev) => {
        const owners = (prev[bggId] ?? []).filter(u => u !== username)
        if (owners.length === 0) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [bggId]: _removed, ...rest } = prev
          return rest
        }
        return { ...prev, [bggId]: owners }
      })
    } catch (err) {
      setUserError(err instanceof Error ? err.message : 'Failed to remove game')
    }
  }, [])

  // Session management - add game to current session
  const addGameToSession = useCallback((bggId: number) => {
    setSessionGameIds((prev) => prev.includes(bggId) ? prev : [...prev, bggId])
    setExcludedBggIds((prev) => prev.filter((id) => id !== bggId))
  }, [])

  // Session management - remove game from current session (not from collection)
  const removeGameFromSession = useCallback((bggId: number) => {
    setSessionGameIds((prev) => prev.filter((id) => id !== bggId))
  }, [])

  const excludeGameFromSession = useCallback((bggId: number) => {
    setExcludedBggIds((prev) => (prev.includes(bggId) ? prev : [...prev, bggId]))
  }, [])

  const undoExcludeGameFromSession = useCallback((bggId: number) => {
    setExcludedBggIds((prev) => prev.filter((id) => id !== bggId))
  }, [])

  // Add an owner to an existing game in session
  const addOwnerToGame = useCallback(async (username: string, bggId: number) => {
    try {
      // Get the game from collection
      const game = games.find((g) => g.bggId === bggId)
      if (!game) {
        setUserError('Game not found in collection')
        return
      }
      // Add ownership link in DB
      await dbService.addGameToUser(username, bggId)
      // Update game owners state
      setGameOwners((prev) => {
        const owners = prev[bggId] ?? []
        if (owners.includes(username)) return prev
        return { ...prev, [bggId]: [...owners, username] }
      })
    } catch (err) {
      setUserError(err instanceof Error ? err.message : 'Failed to add owner')
    }
  }, [games])

  const fetchGameInfo = useCallback(async (url: string) => {
    const info = await bggService.fetchGameInfoFromUrl(url)
    return {
      bggId: info.bggId,
      name: info.name,
      thumbnail: info.thumbnail,
      minPlayers: info.minPlayers,
      maxPlayers: info.maxPlayers,
      bestWith: info.bestWith,
      playingTimeMinutes: info.playingTimeMinutes,
      minPlayTimeMinutes: info.minPlayTimeMinutes,
      maxPlayTimeMinutes: info.maxPlayTimeMinutes,
      minAge: info.minAge,
      averageRating: info.averageRating,
      weight: info.weight,
      categories: info.categories,
      mechanics: info.mechanics,
      description: info.description,
    }
  }, [])

  const addGameManually = useCallback(async (
    usernames: string[],
    game: {
      bggId: number; name: string; minPlayers?: number; maxPlayers?: number
      playingTimeMinutes?: number; minPlayTimeMinutes?: number; maxPlayTimeMinutes?: number
      minAge?: number; thumbnail?: string; averageRating?: number
      weight?: number; categories?: string[]; mechanics?: string[]; description?: string
    }
  ) => {
    setIsLoadingUser(true)
    setUserError(null)
    try {
      for (const username of usernames) {
        const addedGame = await bggService.addGameManually(username, game)
        setGames((prev) => {
          if (prev.some((g) => g.bggId === addedGame.bggId)) return prev
          return [...prev, addedGame]
        })
        // Add to session automatically
        setSessionGameIds((prev) => prev.includes(addedGame.bggId) ? prev : [...prev, addedGame.bggId])
        setGameOwners((prev) => ({
          ...prev,
          [addedGame.bggId]: [...new Set([...(prev[addedGame.bggId] ?? []), username])],
        }))
      }
    } catch (err) {
      setUserError(err instanceof Error ? err.message : 'Failed to add game manually')
    } finally {
      setIsLoadingUser(false)
    }
  }, [])

  const updateGame = useCallback(async (game: GameRecord) => {
    await dbService.updateGame(game)
    setGames((prev) => prev.map((g) => g.bggId === game.bggId ? game : g))
  }, [])

  const refreshGameFromBgg = useCallback(async (bggId: number, options: { keepNotes: boolean }) => {
    const existing = games.find((g) => g.bggId === bggId)
    if (!existing) {
      throw new Error('Game not found')
    }

    let canonical:
      | {
          name: string
          yearPublished?: number
          thumbnail?: string
          minPlayers?: number
          maxPlayers?: number
          bestWith?: string
          playingTimeMinutes?: number
          minPlayTimeMinutes?: number
          maxPlayTimeMinutes?: number
          minAge?: number
          averageRating?: number
          weight?: number
          categories?: string[]
          mechanics?: string[]
          description?: string
        }
      | null = null

    try {
      const details = await bggService.fetchThingDetails([bggId])
      const first = details[0]
      if (first) {
        canonical = {
          name: first.name,
          yearPublished: first.yearPublished,
          thumbnail: first.thumbnail,
          minPlayers: first.minPlayers,
          maxPlayers: first.maxPlayers,
          bestWith: first.bestWith,
          playingTimeMinutes: first.playingTimeMinutes,
          minPlayTimeMinutes: first.minPlayTimeMinutes,
          maxPlayTimeMinutes: first.maxPlayTimeMinutes,
          minAge: first.minAge,
          averageRating: first.averageRating,
          weight: first.weight,
          categories: first.categories,
          mechanics: first.mechanics,
          description: first.description,
        }
      }
    } catch {
      const { fetchPartialGameInfo, toGameDetails } = await import('../services/bgg/bggScraper')
      const partial = await fetchPartialGameInfo(`https://boardgamegeek.com/boardgame/${bggId}`)
      const details = toGameDetails(partial)
      canonical = {
        name: details.name,
        yearPublished: details.yearPublished,
        thumbnail: details.thumbnail,
        minPlayers: details.minPlayers,
        maxPlayers: details.maxPlayers,
        bestWith: details.bestWith,
        playingTimeMinutes: details.playingTimeMinutes,
        minPlayTimeMinutes: details.minPlayTimeMinutes,
        maxPlayTimeMinutes: details.maxPlayTimeMinutes,
        minAge: details.minAge,
        averageRating: details.averageRating,
        weight: details.weight,
        categories: details.categories,
        mechanics: details.mechanics,
        description: details.description,
      }
    }

    if (!canonical) {
      throw new Error('Failed to refresh game from BGG')
    }

    const updated: GameRecord = {
      ...existing,
      ...canonical,
      userNotes: undefined,
      lastFetchedAt: new Date().toISOString(),
    }

    if (!options.keepNotes) {
      await dbService.clearGameNotes(bggId)
    }

    await dbService.updateGame(updated)
    setGames((prev) => prev.map((g) => (g.bggId === bggId ? updated : g)))
    return updated
  }, [games])

  const setPlayerCount = useCallback((count: number) => {
    setFilters((prev) => ({ ...prev, playerCount: count }))
  }, [])

  const setTimeRange = useCallback((range: { min: number; max: number }) => {
    setFilters((prev) => ({ ...prev, timeRange: range }))
  }, [])

  const setMode = useCallback((mode: 'coop' | 'competitive' | 'any') => {
    setFilters((prev) => ({ ...prev, mode }))
  }, [])

  const setExcludeLowRated = useCallback((threshold: number | null) => {
    setFilters((prev) => ({ ...prev, excludeLowRatedThreshold: threshold }))
  }, [])

  const setAgeRange = useCallback((range: { min: number; max: number }) => {
    setFilters((prev) => ({ ...prev, ageRange: range }))
  }, [])

  const setComplexityRange = useCallback((range: { min: number; max: number }) => {
    setFilters((prev) => ({ ...prev, complexityRange: range }))
  }, [])

  const setRatingRange = useCallback((range: { min: number; max: number }) => {
    setFilters((prev) => ({ ...prev, ratingRange: range }))
  }, [])

  const updatePreference = useCallback(
    async (username: string, bggId: number, update: { rank?: number; isTopPick?: boolean; isDisliked?: boolean }) => {
      await dbService.updateGamePreference(username, bggId, update)

      setPreferences((prev) => {
        const now = new Date().toISOString()
        const userPrefs = [...(prev[username] ?? [])]
        const existingIndex = userPrefs.findIndex((p) => p.bggId === bggId)

        if (existingIndex >= 0) {
          const existing = userPrefs[existingIndex]
          const normalized = normalizePreferenceUpdate(existing, update)
          userPrefs[existingIndex] = { ...existing, ...normalized, updatedAt: now }
        } else {
          const normalized = normalizePreferenceUpdate(undefined, update)
          userPrefs.push({ username, bggId, rank: normalized.rank, isTopPick: normalized.isTopPick, isDisliked: normalized.isDisliked, updatedAt: now })
        }

        return { ...prev, [username]: userPrefs }
      })
    },
    []
  )

  const clearPreference = useCallback(async (username: string, bggId: number) => {
    await dbService.deleteUserPreference(username, bggId)
    setPreferences((prev) => {
      const userPrefs = prev[username] ?? []
      return { ...prev, [username]: userPrefs.filter((p) => p.bggId !== bggId) }
    })
  }, [])

  // Reorder preferences via drag and drop (optimistic UI)
  const reorderPreferences = useCallback((username: string, orderedBggIds: number[]) => {
    const now = new Date().toISOString()

    // Update UI immediately so the drop doesn't "snap back" while waiting on IndexedDB.
    setPreferences((prev) => {
      const existing = prev[username] ?? []
      const orderedSet = new Set(orderedBggIds)
      const existingById = new Map(existing.map((p) => [p.bggId, p]))

      // Update existing records.
      const updatedExisting = existing.map((p) => {
        const newIndex = orderedBggIds.indexOf(p.bggId)
        if (newIndex !== -1) {
          return { ...p, rank: newIndex + 1, isTopPick: false, isDisliked: false, updatedAt: now }
        }
        if (p.rank !== undefined && !orderedSet.has(p.bggId)) {
          return { ...p, rank: undefined, updatedAt: now }
        }
        return p
      })

      // Add missing records for newly ranked items (e.g. dragged from Neutral into Ranked).
      const additions = orderedBggIds
        .filter((bggId) => !existingById.has(bggId))
        .map((bggId, index) => ({
          username,
          bggId,
          rank: index + 1,
          isTopPick: false,
          isDisliked: false,
          updatedAt: now,
        }))

      return { ...prev, [username]: [...updatedExisting, ...additions] }
    })

    // Persist in the background.
    void dbService.setUserPreferenceRanks(username, orderedBggIds).catch((err) => {
      console.error('Failed to persist preference ranks:', err)
    })
  }, [])

  const autoSortByRating = useCallback(
    async (username: string) => {
      const ratings = userRatings[username] ?? {}
      const existingPrefs = preferences[username] ?? []
      const dislikedIds = new Set(existingPrefs.filter((p) => p.isDisliked).map((p) => p.bggId))

      const gamesWithRatings = filteredGames
        .filter((g) => ratings[g.bggId] !== undefined)
        .filter((g) => !dislikedIds.has(g.bggId))
        .sort((a, b) => (ratings[b.bggId] ?? 0) - (ratings[a.bggId] ?? 0))

      const rankedPrefs = gamesWithRatings.map((game, index) => ({
        bggId: game.bggId,
        // Top picks and ranking are mutually exclusive.
        rank: index < 3 ? undefined : index - 2,
        isTopPick: index < 3,
        isDisliked: false,
      }))

      const dislikedPrefs = [...dislikedIds].map((bggId) => ({
        bggId,
        rank: undefined,
        isTopPick: false,
        isDisliked: true,
      }))

      const newPrefs = [...rankedPrefs, ...dislikedPrefs]

      await dbService.saveUserPreferences(username, newPrefs)

      setPreferences((prev) => ({
        ...prev,
        [username]: newPrefs.map((p) => ({
          username,
          bggId: p.bggId,
          rank: p.rank,
          isTopPick: p.isTopPick,
          isDisliked: p.isDisliked,
          updatedAt: new Date().toISOString(),
        })),
      }))
    },
    [filteredGames, userRatings, preferences]
  )

  const markRestNeutral = useCallback(async (username: string) => {
    await dbService.clearUserPreferences(username)
    setPreferences((prev) => ({ ...prev, [username]: [] }))
  }, [])

  const computeRecommendation = useCallback(() => {
    // Recommendation is computed reactively via useMemo
  }, [])

  const promoteAlternativeToTopPick = useCallback((bggId: number) => {
    setPromotedPickBggId(bggId)
  }, [])

  const saveNight = useCallback(async (name: string, description?: string) => {
    if (!recommendation.topPick) return

    const excludedSet = new Set(excludedBggIds)
    const organizerUsername = users.find((u) => u.isOrganizer)?.username

    await dbService.saveNight({
      name,
      description,
      organizerUsername,
      usernames: users.map((u) => u.username),
      gameIds: sessionGameIds.filter((id) => !excludedSet.has(id)),
      filters: {
        playerCount: filters.playerCount,
        timeRange: filters.timeRange,
        mode: filters.mode,
        excludeLowRatedThreshold: filters.excludeLowRatedThreshold ?? undefined,
        ageRange: filters.ageRange,
        complexityRange: filters.complexityRange,
        ratingRange: filters.ratingRange,
      },
      pick: {
        bggId: recommendation.topPick.game.bggId,
        name: recommendation.topPick.game.name,
        score: recommendation.topPick.score,
      },
      alternatives: recommendation.alternatives.map((a) => ({
        bggId: a.game.bggId,
        name: a.game.name,
        score: a.score,
      })),
    })
  }, [excludedBggIds, recommendation, users, filters, sessionGameIds])

  const loadSavedNights = useCallback(async () => {
    try {
      const nights = await dbService.getSavedNights()
      setSavedNights(nights)
    } catch (err) {
      console.error('Failed to load saved nights:', err)
    }
  }, [])

  const loadSavedNight = useCallback(async (id: number) => {
    try {
      const savedNight = await dbService.getSavedNight(id)
      if (!savedNight) {
        setUserError('Saved night not found')
        return
      }

      const { data } = savedNight

      // Reset current state
      setUsers([])
      setGames([])
      setSessionGameIds([])
      setExcludedBggIds([])
      setGameOwners({})
      setPreferences({})
      setUserRatings({})

      // Load users from saved night
      const loadedUsers: UserRecord[] = []
      for (const username of data.usernames) {
        let user = await dbService.getUser(username)
        if (!user) {
          // Create local user if doesn't exist
          user = await dbService.createLocalUser(username, username, loadedUsers.length === 0)
        }
        loadedUsers.push(user)
      }

      // Restore organizer (starred player) if the saved night recorded it.
      // Backward compatible: older saved nights will have no organizerUsername.
      if (data.organizerUsername) {
        await dbService.setUserAsOrganizer(data.organizerUsername)
        for (let i = 0; i < loadedUsers.length; i++) {
          loadedUsers[i] = {
            ...loadedUsers[i],
            isOrganizer: loadedUsers[i].username === data.organizerUsername,
          }
        }
      }
      setUsers(loadedUsers)

      // Load games from saved gameIds
      if (data.gameIds && data.gameIds.length > 0) {
        const loadedGames = await dbService.getGames(data.gameIds)
        setGames(loadedGames)
        setSessionGameIds(data.gameIds)

        // Load game owners
        const owners = await dbService.getGameOwners(data.gameIds)
        setGameOwners(owners)
      }

      // Load preferences and ratings for users
      const prefsMap: Record<string, UserPreferenceRecord[]> = {}
      const ratingsMap: Record<string, Record<number, number | undefined>> = {}
      for (const user of loadedUsers) {
        prefsMap[user.username] = await dbService.getUserPreferences(user.username)
        const userGameRecords = await dbService.getUserGames(user.username)
        ratingsMap[user.username] = {}
        for (const ug of userGameRecords) {
          ratingsMap[user.username][ug.bggId] = ug.rating
        }
      }
      setPreferences(prefsMap)
      setUserRatings(ratingsMap)

      // Update existing local users for autocomplete
      const localUsers = await dbService.getLocalUsers()
      setExistingLocalUsers(localUsers)
    } catch (err) {
      setUserError(err instanceof Error ? err.message : 'Failed to load saved night')
    }
  }, [])

  const reset = useCallback(() => {
    setUsers([])
    setGames([])
    setSessionGameIds([])
    setExcludedBggIds([])
    setGameOwners({})
    setFilters(DEFAULT_FILTERS)
    setPreferences({})
    setUserRatings({})
    setUserError(null)
    void clearWizardState()
  }, [])

  return {
    // State
    users,
    games,
    sessionGameIds,
    excludedBggIds,
    gameOwners,
    existingLocalUsers,
    isLoadingUser,
    userError,
    needsApiKey,
    pendingBggUserNotFoundUsername,
    pendingReuseGamesNight,
    filters,
    sessionGames,
    filteredGames,
    preferences,
    userRatings,
    recommendation,
    savedNights,
    layoutMode,

    // Actions
    addBggUser,
    confirmAddBggUserAnyway,
    cancelAddBggUserAnyway,
    confirmReuseGamesFromNight,
    dismissReuseGamesPrompt,
    addLocalUser,
    removeUser,
    deleteUserPermanently,
    setOrganizer,
    searchGame,
    addGameToUser,
    removeGameFromUser,
    addGameToSession,
    removeGameFromSession,
    excludeGameFromSession,
    undoExcludeGameFromSession,
    addOwnerToGame,
    fetchGameInfo,
    addGameManually,
    updateGame,
    refreshGameFromBgg,
    setPlayerCount,
    setTimeRange,
    setMode,
    setExcludeLowRated,
    setAgeRange,
    setComplexityRange,
    setRatingRange,
    updatePreference,
    clearPreference,
    reorderPreferences,
    autoSortByRating,
    markRestNeutral,
    computeRecommendation,
    promoteAlternativeToTopPick,
    saveNight,
    loadSavedNights,
    loadSavedNight,
    reset,
    clearUserError,
    clearNeedsApiKey: () => setNeedsApiKey(false),
    setLayoutMode,
  }
}

function getMatchReasons(game: GameRecord, filters: WizardFilters): string[] {
  const reasons: string[] = []

  if (game.minPlayers && game.maxPlayers) {
    if (filters.playerCount >= game.minPlayers && filters.playerCount <= game.maxPlayers) {
      reasons.push(`✓ ${filters.playerCount} players`)
    }
  }

  if (game.playingTimeMinutes) {
    if (game.playingTimeMinutes <= 30) reasons.push('Quick game')
    else if (game.playingTimeMinutes <= 60) reasons.push('Medium length')
    else reasons.push('Epic session')
  }

  if (filters.mode !== 'any') {
    const isCoop = isCoopGame(game.mechanics)
    if (filters.mode === 'coop' && isCoop) reasons.push('🤝 Cooperative')
    if (filters.mode === 'competitive' && !isCoop) reasons.push('⚔️ Competitive')
  }

  return reasons
}
