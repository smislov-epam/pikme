import { useCallback, useMemo, useRef, useState } from 'react'
import type { DragOverEvent } from '@dnd-kit/core'
import type { PreferenceGameRow } from './PreferencesSections'

export function useRankedDragPreview(params: {
  rankedIds: number[]
  rankedContainerId: string
  rowByBggId: Map<number, PreferenceGameRow>
}) {
  const { rankedIds, rankedContainerId, rowByBggId } = params
  const [draftRankedIds, setDraftRankedIds] = useState<number[] | null>(null)
  const draftRankedIdsRef = useRef<number[] | null>(null)

  const setDraft = useCallback((next: number[] | null) => {
    draftRankedIdsRef.current = next
    setDraftRankedIds(next)
  }, [])

  const rankedForRender = useMemo(() => {
    if (!draftRankedIds) return null
    return draftRankedIds
      .map((id) => rowByBggId.get(id))
      .filter((r): r is PreferenceGameRow => !!r)
  }, [draftRankedIds, rowByBggId])

  const clearDraft = useCallback(() => {
    setDraft(null)
  }, [setDraft])

  const handleDragStartPreview = useCallback(
    (activeId: number | null) => {
      if (activeId == null) return
      // Initialize draft from the current ranked ordering.
      setDraft(rankedIds)
    },
    [rankedIds, setDraft]
  )

  const handleDragOverPreview = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event
      if (!over) return
      if (typeof active.id !== 'number') return

      const activeId = active.id
      const start = draftRankedIdsRef.current ?? rankedIds

      const overIsRanked =
        over.id === rankedContainerId || (typeof over.id === 'number' && start.includes(over.id))

      // Keep Ranked stable unless we are hovering Ranked.
      if (!overIsRanked) return

      const base = start.filter((id) => id !== activeId)
      const insertIndex =
        typeof over.id === 'number' && base.includes(over.id) ? base.indexOf(over.id) : base.length

      const next = [...base]
      next.splice(Math.max(0, insertIndex), 0, activeId)

      if (next.length === start.length && next.every((id, i) => id === start[i])) return
      setDraft(next)
    },
    [rankedContainerId, rankedIds, setDraft]
  )

  return {
    draftRankedIds,
    getDraftRankedIds: () => draftRankedIdsRef.current,
    rankedForRender,
    clearDraft,
    handleDragStartPreview,
    handleDragOverPreview,
  }
}
