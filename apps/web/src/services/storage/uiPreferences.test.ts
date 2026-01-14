import { loadLayoutMode, saveLayoutMode } from './uiPreferences'

describe('uiPreferences', () => {
  it('defaults layoutMode to standard when unset', () => {
    localStorage.removeItem('pikme_layout_mode')
    expect(loadLayoutMode()).toBe('standard')
  })

  it('persists and loads simplified layoutMode', () => {
    saveLayoutMode('simplified')
    expect(loadLayoutMode()).toBe('simplified')
  })
})
