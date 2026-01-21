import { Box, Collapse } from '@mui/material'
import type { UserRecord } from '../../../db/types'
import { LocalPlayersGamesCard } from '../LocalPlayersGamesCard'

export function LocalAddGamesPanel(props: {
  open: boolean
  localUsers: UserRecord[]
  selectedLocalUsers: string[]
  onToggleUser: (username: string) => void
  onSelectAll: () => void
  gameUrlInput: string
  onGameUrlInputChange: (value: string) => void
  onAddGameFromUrl: () => void
  onOpenManualGameDialog?: () => void
  isLoading: boolean
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  onSearch: () => void
  isSearching: boolean
  searchResults: Array<{ bggId: number; name: string; yearPublished?: number }>
  onAddGame: (bggId: number) => void
  addingGameId?: number | null
}) {
  const {
    open,
    localUsers,
    selectedLocalUsers,
    onToggleUser,
    onSelectAll,
    gameUrlInput,
    onGameUrlInputChange,
    onAddGameFromUrl,
    onOpenManualGameDialog,
    isLoading,
    searchQuery,
    onSearchQueryChange,
    onSearch,
    isSearching,
    searchResults,
    onAddGame,
    addingGameId,
  } = props

  return (
    <Collapse in={open} mountOnEnter unmountOnExit>
      <Box sx={{ mt: 0 }}>
        <LocalPlayersGamesCard
          localUsers={localUsers}
          selectedLocalUsers={selectedLocalUsers}
          onToggleUser={onToggleUser}
          onSelectAll={onSelectAll}
          gameUrlInput={gameUrlInput}
          onGameUrlInputChange={onGameUrlInputChange}
          onAddGameFromUrl={onAddGameFromUrl}
          onOpenManualGameDialog={onOpenManualGameDialog}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
          onSearch={onSearch}
          isSearching={isSearching}
          searchResults={searchResults}
          onAddGame={onAddGame}
          addingGameId={addingGameId}
        />
      </Box>
    </Collapse>
  )
}
