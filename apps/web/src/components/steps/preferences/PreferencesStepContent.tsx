import { useCallback, useMemo, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { GameRecord, UserPreferenceRecord, UserRecord } from '../../../db/types'
import { PreferencesQuickActions } from './PreferencesQuickActions'
import { PreferencesUserSelector } from './PreferencesUserSelector'
import { GameCard } from '../PreferenceGameCard'
import { DislikedSection, NeutralSection, RankedSection, type PreferenceGameRow, TopPicksSection } from './PreferencesSections'
import { useToast } from '../../../services/toast'
import { GameDetailsDialog } from '../../gameDetails/GameDetailsDialog'

const TOP_PICKS_LIMIT = 3

const DROPPABLE = {
  top: 'prefs:top',
  ranked: 'prefs:ranked',
  neutral: 'prefs:neutral',
  disliked: 'prefs:disliked',
} as const

type PreferenceBucket = keyof typeof DROPPABLE

export interface PreferencesStepProps {
  users: UserRecord[]
  games: GameRecord[]
  gameOwners: Record<number, string[]>
  preferences: Record<string, UserPreferenceRecord[]>
  userRatings: Record<string, Record<number, number | undefined>>
  onUpdatePreference: (
    username: string,
    bggId: number,
    update: { rank?: number; isTopPick?: boolean; isDisliked?: boolean }
  ) => void
  onReorderPreferences: (username: string, orderedBggIds: number[]) => void
  onClearPreference: (username: string, bggId: number) => void
  onAutoSort: (username: string) => void
  onMarkRestNeutral: (username: string) => void
}

export function PreferencesStepContent({
  users,
  games,
  gameOwners,
  preferences,
  userRatings,
  onUpdatePreference,
  onReorderPreferences,
  onClearPreference,
  onAutoSort,
  onMarkRestNeutral,
}: PreferencesStepProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const toast = useToast()
  const [selectedUserState, setSelectedUserState] = useState(users[0]?.username ?? '')
  const [activeDragId, setActiveDragId] = useState<number | null>(null)
  const [detailsGame, setDetailsGame] = useState<GameRecord | null>(null)

  const selectedUser = useMemo(() => {
    if (users.some((u) => u.username === selectedUserState)) return selectedUserState
    return users[0]?.username ?? ''
  }, [selectedUserState, users])

  const showNotice = useCallback((message: string) => {
    toast.info(message)
  }, [toast])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
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

  const topPicks = useMemo(
    () => gamesWithPrefs.filter((g) => g.pref?.isTopPick),
    [gamesWithPrefs]
  )

  const disliked = useMemo(
    () => gamesWithPrefs.filter((g) => g.pref?.isDisliked),
    [gamesWithPrefs]
  )

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

  const { topPicksForRender, dislikedForRender, neutralForRender } = useMemo(() => {
    if (activeDragId == null) return { topPicksForRender: topPicks, dislikedForRender: disliked, neutralForRender: neutral }
    const keep = (rows: PreferenceGameRow[]) => rows.filter((g) => g.game.bggId !== activeDragId)
    return { topPicksForRender: keep(topPicks), dislikedForRender: keep(disliked), neutralForRender: keep(neutral) }
  }, [activeDragId, disliked, neutral, topPicks])

  const rankedIds = useMemo(() => ranked.map((g) => g.game.bggId), [ranked])
  const topPickIds = useMemo(() => topPicks.map((g) => g.game.bggId), [topPicks])
  const neutralIds = useMemo(() => neutral.map((g) => g.game.bggId), [neutral])
  const dislikedIds = useMemo(() => disliked.map((g) => g.game.bggId), [disliked])

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

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      if (typeof active.id !== 'number') return
      const activeId = active.id

      const bucketOf = (id: string | number): PreferenceBucket | null => {
        if (typeof id === 'string') {
          const match = (Object.keys(DROPPABLE) as PreferenceBucket[]).find((k) => DROPPABLE[k] === id)
          return match ?? null
        }

        if (topPickIds.includes(id)) return 'top'
        if (rankedIds.includes(id)) return 'ranked'
        if (dislikedIds.includes(id)) return 'disliked'
        if (neutralIds.includes(id)) return 'neutral'
        return null
      }

      const source = bucketOf(activeId)
      const target = bucketOf(over.id)
      if (!source || !target) return

      // Reorder within ranked list
      if (source === 'ranked' && target === 'ranked') {
        const oldIndex = rankedIds.indexOf(activeId)
        if (oldIndex === -1) return

        // Dropping on the ranked container means "move to end".
        const newIndex = typeof over.id === 'number' ? rankedIds.indexOf(over.id) : rankedIds.length - 1
        if (newIndex === -1) return

        onReorderPreferences(selectedUser, arrayMove(rankedIds, oldIndex, newIndex))
        return
      }

      // Enforce Top Picks limit on drop
      if (target === 'top' && source !== 'top' && topPicks.length >= TOP_PICKS_LIMIT) {
        showNotice(`Top Picks limited to ${TOP_PICKS_LIMIT}`)
        return
      }

      // Moving into ranked: compute new ordering and let ranks drive the state.
      if (target === 'ranked') {
        const base = rankedIds.filter((id) => id !== activeId)
        const insertAt =
          typeof over.id === 'number' && rankedIds.includes(over.id)
            ? Math.max(0, base.indexOf(over.id))
            : base.length

        const next = [...base]
        next.splice(insertAt, 0, activeId)
        onReorderPreferences(selectedUser, next)
        return
      }

      // If leaving ranked, fix up ranks first.
      if (source === 'ranked') {
        onReorderPreferences(selectedUser, rankedIds.filter((id) => id !== activeId))
      }

      if (target === 'top') {
        onUpdatePreference(selectedUser, activeId, { isTopPick: true })
        return
      }

      if (target === 'disliked') {
        onUpdatePreference(selectedUser, activeId, { isDisliked: true })
        return
      }

      // Move to neutral: remove any existing preference record.
      if (target === 'neutral') {
        if (source === 'ranked') {
          onClearPreference(selectedUser, activeId)
          return
        }

        if (source === 'top') {
          onUpdatePreference(selectedUser, activeId, { isTopPick: false })
          return
        }

        if (source === 'disliked') {
          onUpdatePreference(selectedUser, activeId, { isDisliked: false })
          return
        }
      }
    },
    [
      dislikedIds,
      neutralIds,
      onClearPreference,
      onReorderPreferences,
      onUpdatePreference,
      rankedIds,
      selectedUser,
      showNotice,
      topPickIds,
      topPicks.length,
    ]
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (typeof event.active.id === 'number') {
      setActiveDragId(event.active.id)
    }
  }, [])

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null)
  }, [])

  if (users.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography color="text.secondary">No players added yet. Go back to add players.</Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" gutterBottom sx={{ color: 'primary.dark' }}>Share your preferences</Typography>
        <Typography color="text.secondary">Each player can mark favorites and rank games</Typography>
      </Box>

      <PreferencesUserSelector
        users={users}
        selectedUser={selectedUser}
        isMobile={isMobile}
        onChange={setSelectedUserState}
      />

      <PreferencesQuickActions
        selectedUser={selectedUser}
        onAutoSort={onAutoSort}
        onMarkRestNeutral={onMarkRestNeutral}
      />



      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragCancel={handleDragCancel}
        onDragEnd={(e) => { handleDragEnd(e); setActiveDragId(null) }}
      >
        <TopPicksSection
          topPicks={topPicksForRender}
          droppableId={DROPPABLE.top}
          onOpenDetails={(game) => setDetailsGame(game)}
          onToggleTopPick={handleToggleTopPick}
          onToggleDisliked={handleToggleDisliked}
        />
        <DislikedSection
          disliked={dislikedForRender}
          droppableId={DROPPABLE.disliked}
          onOpenDetails={(game) => setDetailsGame(game)}
          onToggleTopPick={handleToggleTopPick}
          onToggleDisliked={handleToggleDisliked}
        />
        <RankedSection
          ranked={ranked}
          droppableId={DROPPABLE.ranked}
          onOpenDetails={(game) => setDetailsGame(game)}
          onToggleTopPick={handleToggleTopPick}
          onToggleDisliked={handleToggleDisliked}
        />
        <NeutralSection
          neutral={neutralForRender}
          nextRank={ranked.length + 1}
          droppableId={DROPPABLE.neutral}
          onOpenDetails={(game) => setDetailsGame(game)}
          onToggleTopPick={handleToggleTopPick}
          onToggleDisliked={handleToggleDisliked}
          onSetRank={handleSetRank}
        />
        <DragOverlay dropAnimation={null}>
          {activeDragId != null && rowByBggId.get(activeDragId) ? (
            <Box sx={{ pointerEvents: 'none', width: '100%', maxWidth: 560, boxShadow: 6, borderRadius: 2 }}>
              <GameCard
                game={rowByBggId.get(activeDragId)!.game}
                userRating={rowByBggId.get(activeDragId)!.userRating}
                isTopPick={rowByBggId.get(activeDragId)!.isTopPick}
                isDisliked={rowByBggId.get(activeDragId)!.isDisliked}
                onToggleTopPick={() => {}}
                onToggleDisliked={() => {}}
              />
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
