export function isNewerIso(a: string | undefined, b: string | undefined): boolean {
  if (!a) return false
  if (!b) return true
  return a > b
}

export function pick<T>(existing: T | undefined, incoming: T | undefined): T | undefined {
  return existing !== undefined && existing !== null && (existing as unknown) !== '' ? existing : incoming
}

export function pickIsoMax(existing: string | undefined, incoming: string): string {
  return isNewerIso(existing, incoming) ? existing! : incoming
}

export function pickEarlierIso(existing: string | undefined, incoming: string): string {
  if (!existing) return incoming
  return existing < incoming ? existing : incoming
}

export function chunk<T>(arr: T[], size: number): T[][] {
  if (arr.length <= size) return [arr]
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}
