/**
 * usePreferencesDragDrop Hook
 *
 * Encapsulates the drag-and-drop logic for the preferences step,
 * handling moves between buckets (top picks, ranked, neutral, disliked).
 */

import { useCallback, useState } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'

const TOP_PICKS_LIMIT = 3

const DROPPABLE = {
  top: 'prefs:top',
  ranked: 'prefs:ranked',
  neutral: 'prefs:neutral',
  disliked: 'prefs:disliked',
} as const

type PreferenceBucket = keyof typeof DROPPABLE

export { DROPPABLE, TOP_PICKS_LIMIT }
export type { PreferenceBucket }

export interface UsePreferencesDragDropParams {
  selectedUser: string
  rankedIds: number[]
  topPickIds: number[]
  neutralIds: number[]
  dislikedIds: number[]
  topPicksCount: number
  onUpdatePreference: (
    username: string,
    bggId: number,
    update: { rank?: number; isTopPick?: boolean; isDisliked?: boolean }
  ) => void
  onReorderPreferences: (username: string, orderedBggIds: number[]) => void
  onClearPreference: (username: string, bggId: number) => void
  showNotice: (message: string) => void
}

export function usePreferencesDragDrop(params: UsePreferencesDragDropParams) {
  const {
    selectedUser,
    rankedIds,
    topPickIds,
    neutralIds,
    dislikedIds,
    topPicksCount,
    onUpdatePreference,
    onReorderPreferences,
    onClearPreference,
    showNotice,
  } = params

  const [activeDragId, setActiveDragId] = useState<number | null>(null)

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragId(null)
      const { active, over } = event
      if (!over || active.id === over.id) return

      if (typeof active.id !== 'number') return
      const activeId = active.id

      const bucketOf = (id: string | number): PreferenceBucket | null => {
        if (typeof id === 'string') {
          const match = (Object.keys(DROPPABLE) as PreferenceBucket[]).find(
            (k) => DROPPABLE[k] === id
          )
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

        const newIndex =
          typeof over.id === 'number'
            ? rankedIds.indexOf(over.id)
            : rankedIds.length - 1
        if (newIndex === -1) return

        onReorderPreferences(selectedUser, arrayMove(rankedIds, oldIndex, newIndex))
        return
      }

      // Enforce Top Picks limit on drop
      if (target === 'top' && source !== 'top' && topPicksCount >= TOP_PICKS_LIMIT) {
        showNotice(`Top Picks limited to ${TOP_PICKS_LIMIT}`)
        return
      }

      // Moving into ranked: compute new ordering
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

      // If leaving ranked, fix up ranks first
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

      // Move to neutral: remove any existing preference record
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
      topPicksCount,
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

  return {
    activeDragId,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  }
}
