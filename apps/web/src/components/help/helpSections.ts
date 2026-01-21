export interface HelpSection {
  id: string
  label: string
  shortLabel?: string
}

export interface HelpCategory {
  id: string
  label: string
  sections: HelpSection[]
}

export const HELP_SECTIONS: HelpSection[] = [
  { id: 'what-pikme-does', label: 'What PIKME does', shortLabel: 'Intro' },
  { id: 'step-1-players', label: 'Step 1 — Players', shortLabel: 'Players' },
  { id: 'step-2-filters', label: 'Step 2 — Filters', shortLabel: 'Filters' },
  { id: 'step-3-preferences', label: 'Step 3 — Preferences', shortLabel: 'Prefs' },
  { id: 'step-4-result', label: 'Step 4 — Result', shortLabel: 'Result' },
  { id: 'sessions-invites', label: 'Sessions & Invites', shortLabel: 'Sessions' },
  { id: 'joining-session', label: 'Joining a Session', shortLabel: 'Join' },
  { id: 'bgg-api-key', label: 'BGG API key', shortLabel: 'API key' },
  { id: 'export-import', label: 'Export & Import', shortLabel: 'Backup' },
  { id: 'local-storage', label: 'Local storage', shortLabel: 'Storage' },
  { id: 'clear-data', label: 'Clear all data', shortLabel: 'Clear' },
  { id: 'troubleshooting', label: 'Troubleshooting', shortLabel: 'Help' },
]

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: 'getting-started',
    label: 'Intro',
    sections: [{ id: 'what-pikme-does', label: 'What PIKME does', shortLabel: 'About' }],
  },
  {
    id: 'wizard-steps',
    label: 'Wizard',
    sections: [
      { id: 'step-1-players', label: 'Players', shortLabel: 'Players' },
      { id: 'step-2-filters', label: 'Filters', shortLabel: 'Filters' },
      { id: 'step-3-preferences', label: 'Preferences', shortLabel: 'Prefs' },
      { id: 'step-4-result', label: 'Result', shortLabel: 'Result' },
    ],
  },
  {
    id: 'online-sessions',
    label: 'Sessions',
    sections: [
      { id: 'sessions-invites', label: 'Creating Sessions', shortLabel: 'Create' },
      { id: 'joining-session', label: 'Joining a Session', shortLabel: 'Join' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    sections: [
      { id: 'bgg-api-key', label: 'BGG API key', shortLabel: 'API key' },
      { id: 'export-import', label: 'Export & Import', shortLabel: 'Backup' },
    ],
  },
  {
    id: 'data',
    label: 'Data',
    sections: [
      { id: 'local-storage', label: 'Local storage', shortLabel: 'Storage' },
      { id: 'clear-data', label: 'Clear all data', shortLabel: 'Clear' },
      { id: 'troubleshooting', label: 'Troubleshooting', shortLabel: 'Help' },
    ],
  },
]
