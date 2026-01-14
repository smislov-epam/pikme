export type LayoutMode = 'standard' | 'simplified'

const LAYOUT_MODE_KEY = 'pikme_layout_mode'

export function loadLayoutMode(): LayoutMode {
  const raw = localStorage.getItem(LAYOUT_MODE_KEY)
  return raw === 'simplified' ? 'simplified' : 'standard'
}

export function saveLayoutMode(mode: LayoutMode): void {
  localStorage.setItem(LAYOUT_MODE_KEY, mode)
}
