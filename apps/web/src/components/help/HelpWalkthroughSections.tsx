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

export function HelpWalkthroughSections(props: {
  clearRef: RefObject<HTMLDivElement | null>
  settingsRef: RefObject<HTMLDivElement | null>
}) {
  const { clearRef, settingsRef } = props

  return (
    <Stack spacing={2}>
      <HelpTile title="What PIKME does">
        <Stack spacing={0.75}>
          {bullet(<>Guides your group to a single pick via a calm 4-step wizard.</>)}
          {bullet(<>Pulls games from everyone’s collections, then filters and ranks them.</>)}
          {bullet(<>You can stay lightweight: don’t rank everything — “Neutral” is fine.</>)}
          {bullet(<>It’s <strong>local-first</strong>: your data lives in this browser (no login, no server).</>)}
          {bullet(
            <>
              Your local database is stored in <Chip label="IndexedDB" size="small" color="info" />.
            </>,
          )}
        </Stack>

        {tipBox(
          'Good to know',
          <>If you clear browser storage or switch devices/browsers, your data won’t come with you.</>,
        )}
      </HelpTile>

      <HelpTile title="Step 1 — Players">
        <Stack spacing={0.75}>
          {bullet(
            <>
              Add people by <Chip label="BGG username" size="small" /> (imports their collection) or as a{' '}
              <Chip label="local player" size="small" /> (manual/add-by-link).
            </>,
          )}
          {bullet(
            <>
              The session game list is the <Chip label="union" size="small" /> of all selected players’ owned games.
            </>,
          )}
          {bullet(<>If a BGG username can’t be confirmed, you can still add it “anyway” (useful for typos to fix later).</>)}
          {bullet(<>Use “Add New Games to Collection” to paste a BGG link and add games to local players.</>)}
          {bullet(<>You can start from a saved night to reuse players and optionally reuse last time’s games.</>)}
        </Stack>

        {tipBox(
          'Quick tip',
          <>BGG usernames are case-insensitive, but spelling must match the profile URL (e.g., `boardgamegeek.com/user/...`).</>,
        )}
      </HelpTile>

      <HelpTile title="Step 2 — Filters">
        <Stack spacing={0.75}>
          {bullet(
            <>
              Set <Chip label="players" size="small" /> and <Chip label="time" size="small" /> first — these usually narrow the list the most.
            </>,
          )}
          {bullet(<>Use presets for quick starts (example: “Long” targets roughly 90–180 minutes).</>)}
          {bullet(
            <>
              Choose a vibe: <Chip label="Co-op" size="small" /> / <Chip label="Competitive" size="small" /> / “Any”.
            </>,
          )}
          {bullet(<>Toggle Layout (Standard/Simplified) to switch between rich tiles and a compact, fast-scanning list.</>)}
          {bullet(<>If you reach 0 eligible games, loosen constraints (increase time, widen player count, or remove dislikes/exclusions).</>)}
        </Stack>

        {tipBox(
          'When “0 games” happens',
          <>It’s usually a player-count mismatch or too-short time. Try widening those first, then revisit dislikes.</>,
        )}
      </HelpTile>

      <HelpTile title="Step 3 — Preferences">
        <Stack spacing={0.75}>
          {bullet(
            <>
              Rank by dragging games into <Chip label="Top Picks" size="small" color="secondary" /> and then ordering within the list.
            </>,
          )}
          {bullet(
            <>
              <Chip label="Dislike" size="small" color="error" /> is a group-level veto: disliked games are excluded from recommendations.
            </>,
          )}
          {bullet(<>You can leave most games neutral; only rank what you care about.</>)}
          {bullet(<>Use the simplified layout if you prefer quick scanning while ranking.</>)}
          {bullet(<>Ranking numbers appear on the right — higher rank means stronger preference.</>)}
        </Stack>

        {tipBox(
          'Practical approach',
          <>Have each player pick 3–5 “Top Picks” first, then do quick “Dislike” passes — it usually converges fast.</>,
        )}
      </HelpTile>

      <HelpTile title="Step 4 — Result">
        <Stack spacing={0.75}>
          {bullet(<>PIKME shows a “Tonight’s pick” plus a short set of alternatives.</>)}
          {bullet(<>The reasons and score reflect your filters and everyone’s preferences.</>)}
          {bullet(<>Tap a Top Alternative to promote it into “Tonight’s pick” (safe, reversible exploration).</>)}
          {bullet(
            <>
              Use <Chip label="Save game night" size="small" color="success" /> to store a snapshot locally (players + chosen game + notes).
            </>,
          )}
          {bullet(<>When you save, the currently promoted “Tonight’s pick” is what gets saved.</>)}
        </Stack>

        {tipBox(
          'If you can’t decide',
          <>Promote 2–3 alternatives and see how the group reacts — it’s a lightweight “shortlist” workflow.</>,
        )}
      </HelpTile>

      <HelpTile title="BGG API key (optional)" containerRef={settingsRef}>
        <Stack spacing={0.75}>
          {bullet(
            <>
              Without a key: you can still add games via <Chip label="BGG link" size="small" /> (HTML scrape mode).
            </>,
          )}
          {bullet(
            <>
              With a key: better reliability for <Chip label="search" size="small" /> and larger <Chip label="BGG username import" size="small" />.
            </>,
          )}
          {bullet(<>If imports are slow, it may be BGG rate limits — retrying later often works.</>)}
        </Stack>

        {tipBox(
          'Recommendation',
          <>If you use PIKME often, adding an API key makes search and large collections more dependable.</>,
        )}
      </HelpTile>

      <HelpTile title="Local storage & privacy">
        <Stack spacing={0.75}>
          {bullet(<>Your data is stored only for this site in this browser.</>)}
          {bullet(<>Different hostnames are different stores (example: `pikme.online` vs `www.pikme.online`).</>)}
          {bullet(<>Export/backup is the safest way to move data between devices (if enabled in your version).</>)}
          {bullet(<>Clearing browser data or using private mode can remove or isolate your saved data.</>)}
        </Stack>
      </HelpTile>

      <HelpTile title="Clear all data" containerRef={clearRef}>
        <Stack spacing={0.75}>
          {bullet(
            <>
              This deletes the local database for this site in this browser.
              <Chip label="Cannot be undone" size="small" color="error" sx={{ ml: 1 }} />
            </>,
          )}
          {bullet(<>Use this if your local data becomes inconsistent or you want a completely fresh start.</>)}
        </Stack>
      </HelpTile>

      <HelpTile title="Troubleshooting">
        <Stack spacing={0.75}>
          {bullet(<>If an import fails: try again once — slow networks and rate limits can cause temporary failures.</>)}
          {bullet(<>If a game image is missing, that’s usually a BGG/thumbnail fetch issue; the game still works.</>)}
          {bullet(<>If you keep hitting issues: adding a BGG API key improves reliability.</>)}
          {bullet(<>If things feel “stuck”, try reloading the page; your local data should remain intact.</>)}
        </Stack>
      </HelpTile>
    </Stack>
  )
}
