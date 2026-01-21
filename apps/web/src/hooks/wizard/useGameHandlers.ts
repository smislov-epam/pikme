import { useCallback } from 'react'
import type { GameRecord } from '../../db/types'
import type { ManualGameData } from '../../components/steps/PlayerDialogs'
import { normalizePlayTime } from '../../services/bgg/normalizePlayTime'
import { useToast } from '../../services/toast'

export interface UseGameHandlersProps {
  games: GameRecord[]
  gameOwners: Record<number, string[]>
  selectedLocalUsers: string[]
  searchResults: Array<{ bggId: number; name: string; yearPublished?: number }>
  gameUrlInput: string
  manualGame: ManualGameData
  onAddGameToUser: (username: string, bggId: number) => Promise<void>
  onFetchGameInfo: (url: string) => Promise<Partial<ManualGameData> & { bggId: number }>
  onAddGameManually: (usernames: string[], game: ManualGameData) => Promise<void>
  onSearchGame: (query: string) => Promise<Array<{ bggId: number; name: string; yearPublished?: number }>>
  setGameUrlInput: (value: string) => void
  setSearchResults: React.Dispatch<React.SetStateAction<Array<{ bggId: number; name: string; yearPublished?: number }>>>
  setManualGame: (game: ManualGameData) => void
  setShowManualEntry: (show: boolean) => void
  setManualDialogMode: (mode: 'bgg' | 'manual') => void
  setIsFetchingGame: (fetching: boolean) => void
  setIsSearching: (searching: boolean) => void
  setAddingGameId: (id: number | null) => void
}

export function useGameHandlers(props: UseGameHandlersProps) {
  const {
    games, gameOwners, selectedLocalUsers, searchResults, gameUrlInput, manualGame,
    onAddGameToUser, onFetchGameInfo, onAddGameManually, onSearchGame,
    setGameUrlInput, setSearchResults, setManualGame, setShowManualEntry,
    setManualDialogMode, setIsFetchingGame, setIsSearching, setAddingGameId,
  } = props

  const toast = useToast()

  const handleAddGameFromUrl = useCallback(async () => {
    if (!gameUrlInput.trim() || selectedLocalUsers.length === 0) return
    const match = gameUrlInput.match(/boardgamegeek\.com\/boardgame\/(\d+)/i)
    if (!match) return

    const bggId = parseInt(match[1], 10)
    const existingGame = games.find((g) => g.bggId === bggId)
    if (existingGame) {
      const owners = new Set(gameOwners[bggId] ?? [])
      const missingUsers = selectedLocalUsers.filter((u) => !owners.has(u))
      if (missingUsers.length === 0) {
        toast.info(`"${existingGame.name}" is already added for the selected players.`)
        return
      }
      for (const username of missingUsers) {
        await onAddGameToUser(username, bggId)
      }
      toast.success(`Added existing game "${existingGame.name}" to: ${missingUsers.join(', ')}`)
      setGameUrlInput('')
      return
    }

    setIsFetchingGame(true)
    setManualDialogMode('bgg')
    setShowManualEntry(true)
    setManualGame({ name: '', bggId })

    try {
      const gameInfo = await onFetchGameInfo(gameUrlInput.trim())
      const normalizedTime = normalizePlayTime({
        playingTimeMinutes: gameInfo.playingTimeMinutes,
        minPlayTimeMinutes: gameInfo.minPlayTimeMinutes,
        maxPlayTimeMinutes: gameInfo.maxPlayTimeMinutes,
      })
      setManualGame({
        bggId: gameInfo.bggId,
        name: gameInfo.name || '',
        thumbnail: gameInfo.thumbnail,
        minPlayers: gameInfo.minPlayers,
        maxPlayers: gameInfo.maxPlayers,
        bestWith: gameInfo.bestWith,
        playingTimeMinutes: normalizedTime.playingTimeMinutes,
        minPlayTimeMinutes: normalizedTime.minPlayTimeMinutes,
        maxPlayTimeMinutes: normalizedTime.maxPlayTimeMinutes,
        minAge: gameInfo.minAge,
        averageRating: gameInfo.averageRating,
        weight: gameInfo.weight,
        categories: gameInfo.categories,
        mechanics: gameInfo.mechanics,
        description: gameInfo.description,
      })
    } catch {
      // Keep dialog open with just the ID
    } finally {
      setIsFetchingGame(false)
    }
  }, [gameUrlInput, selectedLocalUsers, games, gameOwners, onAddGameToUser, onFetchGameInfo, toast,
      setGameUrlInput, setIsFetchingGame, setManualDialogMode, setShowManualEntry, setManualGame])

  const openManualAddDialog = useCallback(() => {
    if (selectedLocalUsers.length === 0) return
    setIsFetchingGame(false)
    setManualDialogMode('manual')
    setShowManualEntry(true)
    setManualGame({ name: '', bggId: 0 })
  }, [selectedLocalUsers.length, setIsFetchingGame, setManualDialogMode, setShowManualEntry, setManualGame])

  const handleManualGameSubmit = useCallback(async () => {
    if (!manualGame.name.trim() || manualGame.bggId <= 0 || selectedLocalUsers.length === 0) return
    const existingGame = games.find((g) => g.bggId === manualGame.bggId)
    if (existingGame) {
      const owners = new Set(gameOwners[manualGame.bggId] ?? [])
      const missingUsers = selectedLocalUsers.filter((u) => !owners.has(u))
      if (missingUsers.length === 0) {
        toast.info(`"${existingGame.name}" is already added for the selected players.`)
      } else {
        for (const username of missingUsers) {
          await onAddGameToUser(username, manualGame.bggId)
        }
        toast.success(`Added existing game "${existingGame.name}" to: ${missingUsers.join(', ')}`)
      }
      setShowManualEntry(false)
      setManualGame({ name: '', bggId: 0 })
      return
    }
    await onAddGameManually(selectedLocalUsers, manualGame)
    setShowManualEntry(false)
    setGameUrlInput('')
    setManualGame({ name: '', bggId: 0 })
  }, [manualGame, selectedLocalUsers, games, gameOwners, onAddGameToUser, onAddGameManually, toast,
      setShowManualEntry, setManualGame, setGameUrlInput])

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    try {
      const results = await onSearchGame(searchQuery.trim())
      setSearchResults(results.slice(0, 10))
    } finally {
      setIsSearching(false)
    }
  }, [onSearchGame, setIsSearching, setSearchResults])

  const handleAddGame = useCallback(async (bggId: number) => {
    if (selectedLocalUsers.length === 0) return
    setAddingGameId(bggId)
    try {
      for (const username of selectedLocalUsers) await onAddGameToUser(username, bggId)
      const addedGame = searchResults.find((g) => g.bggId === bggId)
      if (addedGame) {
        toast.success(`Added "${addedGame.name}" to ${selectedLocalUsers.join(', ')}`)
      }
      setSearchResults((prev) => prev.filter((r) => r.bggId !== bggId))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add game')
    } finally {
      setAddingGameId(null)
    }
  }, [selectedLocalUsers, searchResults, onAddGameToUser, toast, setAddingGameId, setSearchResults])

  return {
    handleAddGameFromUrl,
    openManualAddDialog,
    handleManualGameSubmit,
    handleSearch,
    handleAddGame,
  }
}
