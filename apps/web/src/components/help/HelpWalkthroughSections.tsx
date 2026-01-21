import type { ReactNode, RefObject } from 'react'
import { Box, Chip, Stack, Typography } from '@mui/material'
import { HelpTile } from './HelpTile'

const bullet = (children: ReactNode) => (
  <Typography component="div" variant="body2" sx={{ lineHeight: 1.55 }}>
    • {children}
  </Typography>
)

const tipBox = (title: string, body: ReactNode) => (
  <Box sx={{ bgcolor: 'action.hover', p: 1.25, borderRadius: 1 }}>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
      {title}
    </Typography>
    <Typography variant="body2">{body}</Typography>
  </Box>
)

export interface HelpWalkthroughSectionsProps {
  clearRef: RefObject<HTMLDivElement | null>
  settingsRef: RefObject<HTMLDivElement | null>
  expandedSections?: Set<string>
  onToggleSection?: (id: string) => void
}

export function HelpWalkthroughSections(props: HelpWalkthroughSectionsProps) {
  const { clearRef, settingsRef, expandedSections, onToggleSection } = props

  const isExpanded = (id: string) => expandedSections?.has(id)

  return (
    <Stack spacing={2}>
      <HelpTile
        id="what-pikme-does"
        title="What PIKME does"
        expanded={isExpanded('what-pikme-does')}
        onToggle={onToggleSection}
        defaultExpanded
      >
        <Stack spacing={0.75}>
          {bullet(<>Guides your group to a single pick via a calm 4-step wizard.</>)}
          {bullet(<>Pulls games from everyone's collections, then filters and ranks them.</>)}
          {bullet(<>You can stay lightweight: don't rank everything — "Neutral" is fine.</>)}
          {bullet(<>It's <strong>local-first</strong>: your data lives in this browser (no login, no server).</>)}
          {bullet(
            <>Your local database is stored in <Chip label="IndexedDB" size="small" color="info" />.</>,
          )}
        </Stack>
        {tipBox('Good to know', <>If you clear browser storage or switch devices/browsers, your data won't come with you.</>)}
      </HelpTile>

      <HelpTile id="step-1-players" title="Step 1 — Players" expanded={isExpanded('step-1-players')} onToggle={onToggleSection}>
        <Stack spacing={0.75}>
          {bullet(<>Add people by <Chip label="BGG username" size="small" /> (imports their collection) or as a <Chip label="local player" size="small" /> (manual/add-by-link).</>)}
          {bullet(<>The session game list is the <Chip label="union" size="small" /> of all selected players' owned games.</>)}
          {bullet(<>If a BGG username can't be confirmed, you can still add it "anyway" (useful for typos to fix later).</>)}
          {bullet(<>Use "Add New Games to Collection" to paste a BGG link or use Manual entry.</>)}
          {bullet(<>You can start from a saved night to reuse players and optionally reuse last time's games.</>)}
        </Stack>
        {tipBox('Quick tip', <>BGG usernames are case-insensitive, but spelling must match the profile URL.</>)}
      </HelpTile>

      <HelpTile id="step-2-filters" title="Step 2 — Filters" expanded={isExpanded('step-2-filters')} onToggle={onToggleSection}>
        <Stack spacing={0.75}>
          {bullet(<>Set <Chip label="players" size="small" /> and <Chip label="time" size="small" /> first — these usually narrow the list the most.</>)}
          {bullet(<>Use presets for quick starts (example: "Long" targets roughly 90–180 minutes).</>)}
          {bullet(<>Choose a vibe: <Chip label="Co-op" size="small" /> / <Chip label="Competitive" size="small" /> / "Any".</>)}
          {bullet(<>Toggle Layout (Standard/Simplified) to switch between rich tiles and a compact list.</>)}
          {bullet(<>If you reach 0 eligible games, loosen constraints (increase time, widen player count).</>)}
        </Stack>
        {tipBox('When "0 games" happens', <>It's usually a player-count mismatch or too-short time. Try widening those first.</>)}
      </HelpTile>

      <HelpTile id="step-3-preferences" title="Step 3 — Preferences" expanded={isExpanded('step-3-preferences')} onToggle={onToggleSection}>
        <Stack spacing={0.75}>
          {bullet(<>Rank by dragging games into <Chip label="Top Picks" size="small" color="secondary" /> and then ordering within the list.</>)}
          {bullet(<><Chip label="Dislike" size="small" color="error" /> is a group-level veto: disliked games are excluded from recommendations.</>)}
          {bullet(<>You can leave most games neutral; only rank what you care about.</>)}
          {bullet(<>Use the simplified layout if you prefer quick scanning while ranking.</>)}
          {bullet(<>Ranking numbers appear on the right — higher rank means stronger preference.</>)}
        </Stack>
        {tipBox('Practical approach', <>Have each player pick 3–5 "Top Picks" first, then do quick "Dislike" passes.</>)}
      </HelpTile>

      <HelpTile id="step-4-result" title="Step 4 — Result" expanded={isExpanded('step-4-result')} onToggle={onToggleSection}>
        <Stack spacing={0.75}>
          {bullet(<>PIKME shows a "Tonight's pick" plus a short set of alternatives.</>)}
          {bullet(<>The reasons and score reflect your filters and everyone's preferences.</>)}
          {bullet(<>Tap a Top Alternative to promote it into "Tonight's pick" (safe, reversible).</>)}
          {bullet(<>Use <Chip label="Save game night" size="small" color="success" /> to store a snapshot locally.</>)}
          {bullet(<>When you save, the currently promoted "Tonight's pick" is what gets saved.</>)}
        </Stack>
        {tipBox("If you can't decide", <>Promote 2–3 alternatives and see how the group reacts.</>)}
      </HelpTile>

      <HelpTile id="sessions-invites" title="Sessions & Invites" expanded={isExpanded('sessions-invites')} onToggle={onToggleSection}>
        <Stack spacing={0.75}>
          {bullet(<><strong>Sessions</strong> let you play together with remote friends — each person contributes preferences from their device.</>)}
          {bullet(<>As the host, create a session from the <Chip label="Share" size="small" color="primary" /> button in the header.</>)}
          {bullet(<>Set up players, filters, and generate an invite link that others can open.</>)}
          {bullet(<>Guests see the filtered game list and can mark their preferences — rankings sync live.</>)}
          {bullet(<>The <Chip label="Result" size="small" /> step aggregates everyone's votes into a final recommendation.</>)}
        </Stack>
        {tipBox('Privacy note', <>Sessions use Firebase Realtime Sync. Only session participants can see preferences.</>)}
      </HelpTile>

      <HelpTile id="joining-session" title="Joining a Session" expanded={isExpanded('joining-session')} onToggle={onToggleSection}>
        <Stack spacing={0.75}>
          {bullet(<>Open the invite link the host shared with you — no account required.</>)}
          {bullet(<>You'll see the host's filtered games. Rank your <Chip label="Top Picks" size="small" color="secondary" /> and <Chip label="Dislikes" size="small" color="error" />.</>)}
          {bullet(<>Your preferences sync to the host in real-time and contribute to the final pick.</>)}
          {bullet(<>You can leave and rejoin using the same link — your preferences are remembered.</>)}
          {bullet(<>Once the host ends the session, the link will no longer work.</>)}
        </Stack>
        {tipBox('Tip', <>Bookmark the link if you might need to return before the session ends.</>)}
      </HelpTile>

      <HelpTile id="bgg-api-key" title="BGG API key (optional)" containerRef={settingsRef} expanded={isExpanded('bgg-api-key')} onToggle={onToggleSection}>
        <Stack spacing={0.75}>
          {bullet(<>Without a key: you can still add games via <Chip label="BGG link" size="small" /> (HTML scrape mode).</>)}
          {bullet(<>With a key: better reliability for <Chip label="search" size="small" /> and larger <Chip label="BGG username import" size="small" />.</>)}
          {bullet(<>If imports are slow, it may be BGG rate limits — retrying later often works.</>)}
        </Stack>
        {tipBox('Recommendation', <>If you use PIKME often, adding an API key makes search and large collections more dependable.</>)}
      </HelpTile>

      <HelpTile id="export-import" title="Export & Import" expanded={isExpanded('export-import')} onToggle={onToggleSection}>
        <Stack spacing={0.75}>
          {bullet(<>Use the <Chip label="Backup & Restore" size="small" /> button in the header to export your data as a ZIP file.</>)}
          {bullet(<>Exports include all your players, games, notes, and saved game nights.</>)}
          {bullet(<>When importing, choose <Chip label="Replace" size="small" /> to start fresh or <Chip label="Merge" size="small" /> to combine with existing data.</>)}
          {bullet(<>Merge mode uses timestamps to keep the most recent version of each record.</>)}
          {bullet(<>Use export regularly to back up your data — especially before clearing browser storage.</>)}
        </Stack>
        {tipBox('Pro tip', <>Export your data before switching devices or browsers. It's the only way to transfer your PIKME history.</>)}
      </HelpTile>

      <HelpTile id="local-storage" title="Local storage & privacy" expanded={isExpanded('local-storage')} onToggle={onToggleSection}>
        <Stack spacing={0.75}>
          {bullet(<>Your data is stored only for this site in this browser.</>)}
          {bullet(<>Different hostnames are different stores (example: pikme.online vs www.pikme.online).</>)}
          {bullet(<>Export/backup is the safest way to move data between devices.</>)}
          {bullet(<>Clearing browser data or using private mode can remove or isolate your saved data.</>)}
        </Stack>
      </HelpTile>

      <HelpTile id="clear-data" title="Clear all data" containerRef={clearRef} expanded={isExpanded('clear-data')} onToggle={onToggleSection}>
        <Stack spacing={0.75}>
          {bullet(<>This deletes the local database for this site in this browser. <Chip label="Cannot be undone" size="small" color="error" sx={{ ml: 1 }} /></>)}
          {bullet(<>Use this if your local data becomes inconsistent or you want a completely fresh start.</>)}
        </Stack>
      </HelpTile>

      <HelpTile id="troubleshooting" title="Troubleshooting" expanded={isExpanded('troubleshooting')} onToggle={onToggleSection}>
        <Stack spacing={0.75}>
          {bullet(<>If an import fails: try again once — slow networks and rate limits can cause temporary failures.</>)}
          {bullet(<>If a game image is missing, that's usually a BGG/thumbnail fetch issue; the game still works.</>)}
          {bullet(<>If you keep hitting issues: adding a BGG API key improves reliability.</>)}
          {bullet(<>If things feel "stuck", try reloading the page; your local data should remain intact.</>)}
        </Stack>
      </HelpTile>
    </Stack>
  )
}
