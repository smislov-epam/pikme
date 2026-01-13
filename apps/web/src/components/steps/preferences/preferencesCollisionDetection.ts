import {
  closestCenter,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  type DroppableContainer,
} from '@dnd-kit/core'

function isRankedItemId(id: unknown, rankedItemIds: number[]) {
  return typeof id === 'number' && rankedItemIds.includes(id)
}

export function createPreferencesCollisionDetection(params: {
  rankedContainerId: string
  rankedItemIds: number[]
}): CollisionDetection {
  const { rankedContainerId, rankedItemIds } = params

  return (args) => {
    const pointerCollisions = pointerWithin(args)
    const collisions = pointerCollisions.length ? pointerCollisions : rectIntersection(args)

    const overId = getFirstCollision(collisions, 'id')

    // If we're over the ranked container, prefer the closest ranked item instead.
    // This keeps sortable reordering stable even with an explicit droppable wrapper.
    if (overId === rankedContainerId && rankedItemIds.length > 0) {
      const rankedDroppables: DroppableContainer[] = args.droppableContainers.filter((c) =>
        isRankedItemId(c.id, rankedItemIds)
      )

      const rankedCollisions = closestCenter({ ...args, droppableContainers: rankedDroppables })
      return rankedCollisions.length ? rankedCollisions : collisions
    }

    if (overId != null) return collisions

    // Fallback: if nothing is intersecting, pick the closest center.
    return closestCenter(args)
  }
}
