import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { ThemeProvider } from '@mui/material/styles'
import { theme } from '../../theme/theme'
import { ToastProvider } from '../../services/toast'
import type { SavedNightRecord, UserRecord } from '../../db/types'
import { PlayersStep } from './PlayersStep'

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ThemeProvider theme={theme}>
      <ToastProvider>{ui}</ToastProvider>
    </ThemeProvider>,
  )
}

function makeSavedNight(overrides?: Partial<SavedNightRecord>): SavedNightRecord {
  return {
    id: 1,
    createdAt: new Date('2025-01-01T00:00:00.000Z').toISOString(),
    data: {
      name: 'Friday Night',
      organizerUsername: 'Alice',
      usernames: ['Alice', 'Bob', 'Cara'],
      gameIds: [123],
      filters: {},
      pick: { bggId: 123, name: 'Test Game', score: 1 },
      alternatives: [],
    },
    ...overrides,
  }
}

describe('PlayersStep', () => {
  it('prompts for confirmation before loading a saved night', async () => {
    const onLoadSavedNight = vi.fn().mockResolvedValue(undefined)

    const users: UserRecord[] = [{ username: 'Alice', internalId: 'alice-test', isBggUser: false, isOrganizer: true }]

    renderWithProviders(
      <PlayersStep
        users={users}
        games={[]}
        sessionGames={[]}
        gameOwners={{}}
        layoutMode="standard"
        onLayoutModeChange={vi.fn()}
        existingLocalUsers={[]}
        savedNights={[makeSavedNight()]}
        pendingBggUserNotFoundUsername={null}
        onConfirmAddBggUserAnyway={vi.fn().mockResolvedValue(undefined)}
        onCancelAddBggUserAnyway={vi.fn()}
        onAddBggUser={vi.fn().mockResolvedValue(undefined)}
        onAddLocalUser={vi.fn().mockResolvedValue(undefined)}
        onRemoveUser={vi.fn()}
        onDeleteUser={vi.fn().mockResolvedValue(undefined)}
        onSetOrganizer={vi.fn().mockResolvedValue(undefined)}
        onSearchGame={vi.fn().mockResolvedValue([])}
        onAddGameToUser={vi.fn().mockResolvedValue(undefined)}
        onRemoveGameFromUser={vi.fn().mockResolvedValue(undefined)}
        onAddGameToSession={vi.fn()}
        onRemoveGameFromSession={vi.fn()}
        onExcludeGameFromSession={vi.fn()}
        onUndoExcludeGameFromSession={vi.fn()}
        onAddOwnerToGame={vi.fn().mockResolvedValue(undefined)}
        onLoadSavedNight={onLoadSavedNight}
        onFetchGameInfo={vi.fn().mockResolvedValue({ bggId: 1 })}
        onAddGameManually={vi.fn().mockResolvedValue(undefined)}
        onEditGame={vi.fn().mockResolvedValue(undefined)}
        onRefreshGameFromBgg={vi.fn().mockResolvedValue({ bggId: 1, name: 'X', lastFetchedAt: '' })}
        isLoading={false}
        error={null}
      />,
    )

    expect(screen.getByText('Start from a previous game night, or add players to begin')).toBeInTheDocument()

    const input = screen.getByPlaceholderText('Load a previous game night...')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    await screen.findByRole('listbox')

    fireEvent.click(screen.getByText('Friday Night'))

    expect(screen.getByText('Load saved game night?')).toBeInTheDocument()
    expect(screen.getByText('Players: Alice, Bob, Cara')).toBeInTheDocument()
    expect(screen.getByText('Host: Alice')).toBeInTheDocument()

    expect(onLoadSavedNight).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Load' }))

    await waitFor(() => {
      expect(onLoadSavedNight).toHaveBeenCalledWith(1, { includeGames: true })
    })
  })

  it('shows and hides the Add New Games panel via the action button', async () => {
    const users: UserRecord[] = [{ username: 'Alice', internalId: 'alice-test', isBggUser: false, isOrganizer: true }]

    renderWithProviders(
      <PlayersStep
        users={users}
        games={[]}
        sessionGames={[]}
        gameOwners={{}}
        layoutMode="standard"
        onLayoutModeChange={vi.fn()}
        existingLocalUsers={[]}
        savedNights={[]}
        pendingBggUserNotFoundUsername={null}
        onConfirmAddBggUserAnyway={vi.fn().mockResolvedValue(undefined)}
        onCancelAddBggUserAnyway={vi.fn()}
        onAddBggUser={vi.fn().mockResolvedValue(undefined)}
        onAddLocalUser={vi.fn().mockResolvedValue(undefined)}
        onRemoveUser={vi.fn()}
        onDeleteUser={vi.fn().mockResolvedValue(undefined)}
        onSetOrganizer={vi.fn().mockResolvedValue(undefined)}
        onSearchGame={vi.fn().mockResolvedValue([])}
        onAddGameToUser={vi.fn().mockResolvedValue(undefined)}
        onRemoveGameFromUser={vi.fn().mockResolvedValue(undefined)}
        onAddGameToSession={vi.fn()}
        onRemoveGameFromSession={vi.fn()}
        onExcludeGameFromSession={vi.fn()}
        onUndoExcludeGameFromSession={vi.fn()}
        onAddOwnerToGame={vi.fn().mockResolvedValue(undefined)}
        onLoadSavedNight={vi.fn().mockResolvedValue(undefined)}
        onFetchGameInfo={vi.fn().mockResolvedValue({ bggId: 1 })}
        onAddGameManually={vi.fn().mockResolvedValue(undefined)}
        onEditGame={vi.fn().mockResolvedValue(undefined)}
        onRefreshGameFromBgg={vi.fn().mockResolvedValue({ bggId: 1, name: 'X', lastFetchedAt: '' })}
        isLoading={false}
        error={null}
      />,
    )

    expect(screen.queryByText('Select users to add games to:')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add New Games to Collection' }))

    expect(await screen.findByText('Select users to add games to:')).toBeInTheDocument()

    // Close by toggling the expandable header again
    fireEvent.click(screen.getByRole('button', { name: 'Add New Games to Collection' }))

    await waitFor(() => {
      expect(screen.queryByText('Select users to add games to:')).not.toBeInTheDocument()
    })
  })

  it('shows a confirmation dialog when a BGG username cannot be confirmed', async () => {
    const onCancelAddBggUserAnyway = vi.fn()
    const onConfirmAddBggUserAnyway = vi.fn().mockResolvedValue(undefined)

    renderWithProviders(
      <PlayersStep
        users={[]}
        games={[]}
        sessionGames={[]}
        gameOwners={{}}
        layoutMode="standard"
        onLayoutModeChange={vi.fn()}
        existingLocalUsers={[]}
        savedNights={[]}
        pendingBggUserNotFoundUsername="ghost_user"
        onConfirmAddBggUserAnyway={onConfirmAddBggUserAnyway}
        onCancelAddBggUserAnyway={onCancelAddBggUserAnyway}
        onAddBggUser={vi.fn().mockResolvedValue(undefined)}
        onAddLocalUser={vi.fn().mockResolvedValue(undefined)}
        onRemoveUser={vi.fn()}
        onDeleteUser={vi.fn().mockResolvedValue(undefined)}
        onSetOrganizer={vi.fn().mockResolvedValue(undefined)}
        onSearchGame={vi.fn().mockResolvedValue([])}
        onAddGameToUser={vi.fn().mockResolvedValue(undefined)}
        onRemoveGameFromUser={vi.fn().mockResolvedValue(undefined)}
        onAddGameToSession={vi.fn()}
        onRemoveGameFromSession={vi.fn()}
        onExcludeGameFromSession={vi.fn()}
        onUndoExcludeGameFromSession={vi.fn()}
        onAddOwnerToGame={vi.fn().mockResolvedValue(undefined)}
        onLoadSavedNight={vi.fn().mockResolvedValue(undefined)}
        onFetchGameInfo={vi.fn().mockResolvedValue({ bggId: 1 })}
        onAddGameManually={vi.fn().mockResolvedValue(undefined)}
        onEditGame={vi.fn().mockResolvedValue(undefined)}
        onRefreshGameFromBgg={vi.fn().mockResolvedValue({ bggId: 1, name: 'X', lastFetchedAt: '' })}
        isLoading={false}
        error={null}
      />,
    )

    expect(screen.getByText('User not found on BGG')).toBeInTheDocument()
    expect(screen.getByText(/ghost_user/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancelAddBggUserAnyway).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Add anyway' }))
    await waitFor(() => expect(onConfirmAddBggUserAnyway).toHaveBeenCalledTimes(1))
  })
})
