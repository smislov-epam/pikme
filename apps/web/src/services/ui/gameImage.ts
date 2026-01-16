import type { GameRecord } from '../../db/types'

const PALETTE: Array<[string, string]> = [
  ['#2B59C3', '#5BC0EB'],
  ['#9C27B0', '#EC407A'],
  ['#2E7D32', '#81C784'],
  ['#F57C00', '#FFB74D'],
  ['#455A64', '#90A4AE'],
  ['#6D4C41', '#A1887F'],
]

export function getGamePlaceholderImage(game: GameRecord): string {
  const seed = Number.isFinite(game.bggId) ? game.bggId : hashString(game.name)
  const index = Math.abs(seed) % PALETTE.length
  const [start, end] = PALETTE[index]!
  const initials = (game.name || 'Game')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('')
    .slice(0, 2)

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${start}" />
      <stop offset="100%" stop-color="${end}" />
    </linearGradient>
  </defs>
  <rect width="96" height="96" rx="12" fill="url(#g)" />
  <circle cx="72" cy="24" r="18" fill="rgba(255,255,255,0.18)" />
  <circle cx="20" cy="76" r="14" fill="rgba(255,255,255,0.12)" />
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700"
        fill="rgba(255,255,255,0.9)">${initials}</text>
</svg>`

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export function getGameImageOrPlaceholder(game: GameRecord): string {
  return game.thumbnail || getGamePlaceholderImage(game)
}

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return hash
}
