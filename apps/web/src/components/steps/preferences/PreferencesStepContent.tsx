import { useCallback, useMemo, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { GameRecord, UserPreferenceRecord, UserRecord } from '../../../db/types'
import { PreferencesUserSelector } from './PreferencesUserSelector'
import type { GuestStatus } from './types'
import { GameCard } from '../PreferenceGameCard'
import { DislikedSection, NeutralSection, RankedSection, type PreferenceGameRow, TopPicksSection } from './PreferencesSections'
import { useToast } from '../../../services/toast'
import { GameDetailsDialog } from '../../gameDetails/GameDetailsDialog'
import { LayoutToggle } from '../../LayoutToggle'
import type { LayoutMode } from '../../../services/storage/uiPreferences'
import { PreferenceRowCard } from './PreferenceRowCard'
import { SectionHeader } from '../../ui/SectionHeader'
import { usePreferencesDragDrop, DROPPABLE, TOP_PICKS_LIMIT } from './usePreferencesDragDrop'
import { useNewGameIds } from './useNewGameIds'

export interface PreferencesStepProps {
  users: UserRecord[]
  games: GameRecord[]
  gameOwners: Record<number, string[]>
  layoutMode: LayoutMode
  onLayoutModeChange: (mode: LayoutMode) => void
  preferences: Record<string, UserPreferenceRecord[]>
  userRatings: Record<string, Record<number, number | undefined>>
  onUpdatePreference: (
    username: string,
    bggId: number,
    update: { rank?: number; isTopPick?: boolean; isDisliked?: boolean }
  ) => void
  onReorderPreferences: (username: string, orderedBggIds: number[]) => void
  onClearPreference: (username: string, bggId: number) => void
  /** Optional guest statuses (for showing ready indicators on host) */
  guestStatuses?: GuestStatus[]
  /** Force full tile layout even on mobile */
  forceFullTiles?: boolean
  /** Hide layout toggle (e.g., guest quick share) */
  hideLayoutToggle?: boolean
  /** Read-only mode for viewing other users' preferences (REQ-106) */
  readOnly?: boolean
  /** Username of the user whose preferences should be shown in read-only mode */
  readOnlyUsername?: string
}

export function PreferencesStepContent({
  users,
  games,
  gameOwners,
  layoutMode,
  onLayoutModeChange,
  preferences,
  userRatings,
  onUpdatePreference,
  onReorderPreferences,
  onClearPreference,
  guestStatuses = [],
  forceFullTiles = false,
  hideLayoutToggle = false,
  readOnly = false,
  readOnlyUsername,
}: PreferencesStepProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const toast = useToast()
  const [selectedUserState, setSelectedUserState] = useState(users[0]?.username ?? '')
  const [detailsGame, setDetailsGame] = useState<GameRecord | null>(null)
  const [showOnlyNewGames, setShowOnlyNewGames] = useState(false)

  // In read-only mode, always show the specified user's preferences
  const selectedUser = useMemo(() => {
    if (readOnly && readOnlyUsername) return readOnlyUsername
    if (users.some((u) => u.username === selectedUserState)) return selectedUserState
    return users[0]?.username ?? ''
  }, [selectedUserState, users, readOnly, readOnlyUsername])

  const effectiveLayoutMode: LayoutMode = isMobile && !forceFullTiles ? 'simplified' : layoutMode

  const selectedUserRecord = useMemo(
    () => users.find((u) => u.username === selectedUser) ?? null,
    [selectedUser, users]
  )

  const { newGameIds } = useNewGameIds({
    username: selectedUser,
    gameIds: games.map((g) => g.bggId),
    lastPreferencesReviewedAt: selectedUserRecord?.lastPreferencesReviewedAt,
  })

  const hasNewGames = newGameIds.size > 0

  const showNotice = useCallback((message: string) => {
    toast.info(message)
  }, [toast])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const gamesWithPrefs: Array<PreferenceGameRow & { pref?: UserPreferenceRecord }> = useMemo(() => {
    const currentUserPrefs = preferences[selectedUser] ?? []
    const currentUserRatings = userRatings[selectedUser] ?? {}

    return games.map((game) => {
      const pref = currentUserPrefs.find((p) => p.bggId === game.bggId)
      return {
        game,
        pref,
        userRating: currentUserRatings[game.bggId],
        isTopPick: pref?.isTopPick,
        isDisliked: pref?.isDisliked,
      }
    })
  }, [games, preferences, selectedUser, userRatings])

  const rowByBggId = useMemo(() => {
    const map = new Map<number, PreferenceGameRow>()
    for (const row of gamesWithPrefs) {
      map.set(row.game.bggId, row)
    }
    return map
  }, [gamesWithPrefs])

  const disliked = useMemo(() => gamesWithPrefs.filter((g) => g.pref?.isDisliked), [gamesWithPrefs])

  const topPicks = useMemo(() => gamesWithPrefs.filter((g) => g.pref?.isTopPick && !g.pref?.isDisliked), [gamesWithPrefs])

  const ranked = useMemo(
    () =>
      gamesWithPrefs
        .filter((g) => !g.pref?.isTopPick && !g.pref?.isDisliked && g.pref?.rank !== undefined)
        .sort((a, b) => (a.pref?.rank ?? 0) - (b.pref?.rank ?? 0)),
    [gamesWithPrefs]
  )

  const neutral = useMemo(
    () => gamesWithPrefs.filter((g) => !g.pref?.isTopPick && !g.pref?.isDisliked && g.pref?.rank === undefined),
    [gamesWithPrefs]
  )

  const rankedIds = useMemo(() => ranked.map((g) => g.game.bggId), [ranked])
  const topPickIds = useMemo(() => topPicks.map((g) => g.game.bggId), [topPicks])
  const neutralIds = useMemo(() => neutral.map((g) => g.game.bggId), [neutral])
  const dislikedIds = useMemo(() => disliked.map((g) => g.game.bggId), [disliked])

  // Use the drag-and-drop hook
  const { activeDragId, handleDragStart, handleDragEnd, handleDragCancel } = usePreferencesDragDrop({
    selectedUser,
    rankedIds,
    topPickIds,
    neutralIds,
    dislikedIds,
    topPicksCount: topPicks.length,
    onUpdatePreference,
    onReorderPreferences,
    onClearPreference,
    showNotice,
  })

  const { topPicksForRender, dislikedForRender, neutralForRender } = useMemo(() => {
    if (activeDragId == null) return { topPicksForRender: topPicks, dislikedForRender: disliked, neutralForRender: neutral }
    const keep = (rows: PreferenceGameRow[]) => rows.filter((g) => g.game.bggId !== activeDragId)
    return { topPicksForRender: keep(topPicks), dislikedForRender: keep(disliked), neutralForRender: keep(neutral) }
  }, [activeDragId, disliked, neutral, topPicks])

  const neutralForDisplay = useMemo(() => {
    if (!showOnlyNewGames) return neutralForRender
    return neutralForRender.filter((row) => newGameIds.has(row.game.bggId))
  }, [neutralForRender, newGameIds, showOnlyNewGames])

  const handleToggleTopPick = useCallback(
    (bggId: number, currentlyTopPick: boolean) => {
      if (!currentlyTopPick && topPicks.length >= TOP_PICKS_LIMIT) {
        showNotice(`Top Picks limited to ${TOP_PICKS_LIMIT}`)
        return
      }
      onUpdatePreference(selectedUser, bggId, { isTopPick: !currentlyTopPick })
    },
    [onUpdatePreference, selectedUser, showNotice, topPicks.length]
  )

  const handleToggleDisliked = useCallback(
    (bggId: number, currentlyDisliked: boolean) => {
      onUpdatePreference(selectedUser, bggId, { isDisliked: !currentlyDisliked })
    },
    [onUpdatePreference, selectedUser]
  )

  const handleSetRank = useCallback(
    (bggId: number, rankValue: number) => {
      onUpdatePreference(selectedUser, bggId, { rank: rankValue })
    },
    [onUpdatePreference, selectedUser]
  )

  if (users.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography color="text.secondary">No players added yet. Go back to add players.</Typography>
        </CardContent>
      </Card>
    )
  }

  // In read-only mode, disable all edit actions
  const effectiveOnToggleTopPick = readOnly ? () => {} : handleToggleTopPick
  const effectiveOnToggleDisliked = readOnly ? () => {} : handleToggleDisliked
  const effectiveOnSetRank = readOnly ? () => {} : handleSetRank
  
  // Find the display name for the read-only user
  const readOnlyUserDisplayName = readOnlyUsername 
    ? users.find((u) => u.username === readOnlyUsername)?.displayName || readOnlyUsername
    : ''

  return (
    <Stack spacing={3}>
      {/* Read-only banner (REQ-106) */}
      {readOnly && readOnlyUserDisplayName && (
        <Box
          sx={{
            px: 2,
            py: 1,
            bgcolor: 'action.hover',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Viewing <strong>{readOnlyUserDisplayName}</strong>&apos;s preferences (read-only)
          </Typography>
        </Box>
      )}

      <SectionHeader
        title={readOnly ? `${readOnlyUserDisplayName}'s preferences` : 'Share your preferences'}
        subtitle={readOnly ? 'View only - you cannot edit these preferences' : 'Each player can mark favorites and rank games'}
        titleVariant="h5"
        titleColor="primary.dark"
      />

      {/* Hide user selector in read-only mode */}
      {!readOnly && (
        <PreferencesUserSelector
          users={users}
          selectedUser={selectedUser}
          isMobile={isMobile}
          onChange={setSelectedUserState}
          preferences={preferences}
          gameIds={games.map((g) => g.bggId)}
          guestStatuses={guestStatuses}
        />
      )}

      {!isMobile ? (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, alignItems: 'center' }}>
          {hasNewGames ? (
            <FormControlLabel
              label={`Only new games (${newGameIds.size})`}
              control={
                <Switch
                  size="small"
                  checked={showOnlyNewGames}
                  onChange={(e) => setShowOnlyNewGames(e.target.checked)}
                />
              }
              sx={{ mr: 0 }}
            />
          ) : null}
          {!hideLayoutToggle && (
            <LayoutToggle layoutMode={layoutMode} onChange={onLayoutModeChange} variant="icon" />
          )}
        </Box>
      ) : null}

      <DndContext
        sensors={readOnly ? [] : sensors}
        collisionDetection={closestCenter}
        onDragStart={readOnly ? undefined : handleDragStart}
        onDragCancel={readOnly ? undefined : handleDragCancel}
        onDragEnd={readOnly ? undefined : handleDragEnd}
      >
        <TopPicksSection
          topPicks={topPicksForRender}
          droppableId={DROPPABLE.top}
          layoutMode={effectiveLayoutMode}
          onOpenDetails={(game) => setDetailsGame(game)}
          onToggleTopPick={effectiveOnToggleTopPick}
          onToggleDisliked={effectiveOnToggleDisliked}
          readOnly={readOnly}
        />
        <DislikedSection
          disliked={dislikedForRender}
          droppableId={DROPPABLE.disliked}
          layoutMode={effectiveLayoutMode}
          onOpenDetails={(game) => setDetailsGame(game)}
          onToggleTopPick={effectiveOnToggleTopPick}
          onToggleDisliked={effectiveOnToggleDisliked}
          readOnly={readOnly}
        />
        <RankedSection
          ranked={ranked}
          droppableId={DROPPABLE.ranked}
          layoutMode={effectiveLayoutMode}
          onOpenDetails={(game) => setDetailsGame(game)}
          onToggleTopPick={effectiveOnToggleTopPick}
          onToggleDisliked={effectiveOnToggleDisliked}
          readOnly={readOnly}
        />
        <NeutralSection
          neutral={neutralForDisplay}
          nextRank={ranked.length + 1}
          droppableId={DROPPABLE.neutral}
          layoutMode={effectiveLayoutMode}
          onOpenDetails={(game) => setDetailsGame(game)}
          onToggleTopPick={effectiveOnToggleTopPick}
          onToggleDisliked={effectiveOnToggleDisliked}
          onSetRank={effectiveOnSetRank}
          readOnly={readOnly}
        />
        <DragOverlay dropAnimation={null}>
          {activeDragId != null && rowByBggId.get(activeDragId) ? (
            <Box sx={{ pointerEvents: 'none', width: '100%', maxWidth: 560, boxShadow: 6, borderRadius: 2 }}>
              {effectiveLayoutMode === 'simplified' ? (
                <PreferenceRowCard
                  game={rowByBggId.get(activeDragId)!.game}
                  userRating={rowByBggId.get(activeDragId)!.userRating}
                  isTopPick={rowByBggId.get(activeDragId)!.isTopPick}
                  isDisliked={rowByBggId.get(activeDragId)!.isDisliked}
                  onToggleTopPick={() => {}}
                  onToggleDisliked={() => {}}
                />
              ) : (
                <GameCard
                  game={rowByBggId.get(activeDragId)!.game}
                  userRating={rowByBggId.get(activeDragId)!.userRating}
                  isTopPick={rowByBggId.get(activeDragId)!.isTopPick}
                  isDisliked={rowByBggId.get(activeDragId)!.isDisliked}
                  onToggleTopPick={() => {}}
                  onToggleDisliked={() => {}}
                />
              )}
            </Box>
          ) : null}
        </DragOverlay>
      </DndContext>

      <GameDetailsDialog
        open={!!detailsGame}
        game={detailsGame}
        owners={detailsGame ? (gameOwners[detailsGame.bggId] ?? []) : []}
        users={users}
        onClose={() => setDetailsGame(null)}
      />
    </Stack>
  )
}
