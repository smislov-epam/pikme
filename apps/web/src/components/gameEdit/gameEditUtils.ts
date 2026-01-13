import type { GameRecord } from '../../db/types'

export function formatPlayTime(game: GameRecord): string {
  const min = game.minPlayTimeMinutes
  const max = game.maxPlayTimeMinutes
  const avg = game.playingTimeMinutes
  if (min && max && min !== max) return `${min}-${max} min`
  if (min) return `${min} min`
  if (max) return `${max} min`
  if (avg) return `${avg} min`
  return ''
}

export function getComplexityLabel(weight: number): string {
  if (weight < 1.5) return 'Light'
  if (weight < 2.5) return 'Easy'
  if (weight < 3.5) return 'Medium'
  if (weight < 4.5) return 'Heavy'
  return 'Complex'
}

export function getComplexityColor(weight: number): string {
  if (weight < 1.5) return '#4caf50'
  if (weight < 2.5) return '#8bc34a'
  if (weight < 3.5) return '#ff9800'
  if (weight < 4.5) return '#f44336'
  return '#9c27b0'
}
