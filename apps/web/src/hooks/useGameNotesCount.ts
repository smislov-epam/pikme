import { useEffect, useState } from 'react'
import * as notesService from '../services/db/gameNotesService'

/**
 * Hook that returns the count of notes for a game.
 * Re-fetches whenever the bggId changes.
 */
export function useGameNotesCount(bggId: number): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    const fetchCount = async () => {
      if (!bggId) {
        setCount(0)
        return
      }
      const notes = await notesService.listGameNotes(bggId)
      if (!cancelled) {
        setCount(notes.length)
      }
    }

    void fetchCount()

    return () => {
      cancelled = true
    }
  }, [bggId])

  return count
}
