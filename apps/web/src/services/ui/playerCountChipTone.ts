export type PlayerCountChipTone = 'selected' | 'inSession' | 'aboveSession'

export function playerCountChipTone(args: {
  count: number
  selectedCount: number
  sessionUserCount: number
}): PlayerCountChipTone {
  const { count, selectedCount, sessionUserCount } = args

  if (count === selectedCount) return 'selected'

  // If no roster is configured yet, treat all options as "in session" (selectable blue)
  // because the player count filter is still meaningful on its own.
  if (sessionUserCount <= 0) return 'inSession'

  return count <= sessionUserCount ? 'inSession' : 'aboveSession'
}
