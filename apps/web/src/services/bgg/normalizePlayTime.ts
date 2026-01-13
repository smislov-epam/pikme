export interface PlayTimeFields {
  playingTimeMinutes?: number
  minPlayTimeMinutes?: number
  maxPlayTimeMinutes?: number
}

export function normalizePlayTime(fields: PlayTimeFields): PlayTimeFields {
  const min = fields.minPlayTimeMinutes
  const max = fields.maxPlayTimeMinutes
  const avg = fields.playingTimeMinutes

  const derivedMin = min ?? avg
  const derivedMax = max ?? avg

  const derivedAvg = avg
    ?? (derivedMin != null && derivedMax != null
      ? Math.round((derivedMin + derivedMax) / 2)
      : undefined)

  return {
    playingTimeMinutes: derivedAvg,
    minPlayTimeMinutes: derivedMin,
    maxPlayTimeMinutes: derivedMax,
  }
}
