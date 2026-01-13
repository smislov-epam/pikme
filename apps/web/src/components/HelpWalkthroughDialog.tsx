import { type ReactNode, useEffect, useRef } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'

export type HelpTopic = 'clear' | 'settings' | null

export function HelpWalkthroughDialog(props: {
  open: boolean
  focusTopic?: HelpTopic
  onClose: () => void
}) {
  const { open, focusTopic = null, onClose } = props

  const clearRef = useRef<HTMLDivElement | null>(null)
  const settingsRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    if (focusTopic === 'clear') clearRef.current?.scrollIntoView({ block: 'start' })
    if (focusTopic === 'settings') settingsRef.current?.scrollIntoView({ block: 'start' })
  }, [focusTopic, open])

  const section = (title: string, content: ReactNode, opts?: { ref?: React.RefObject<HTMLDivElement | null> }) => (
    <Box
      ref={opts?.ref}
      sx={{
        scrollMarginTop: 16,
        p: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
        {title}
      </Typography>
      <Stack spacing={0.75}>{content}</Stack>
    </Box>
  )

  const bullet = (children: ReactNode) => (
    <Typography component="div" variant="body2" sx={{ lineHeight: 1.5 }}>
      • {children}
    </Typography>
  )

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        PIKME walkthrough
        <IconButton
          aria-label="Close walkthrough"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          maxHeight: { xs: '70vh', sm: '65vh' },
        }}
      >
        <Stack spacing={2}>
          <Alert severity="info">
            Quick concept check: PIKME is <strong>local-first</strong> — your data stays in this browser.
          </Alert>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label="Players" size="small" color="primary" />
            <Chip label="Filters" size="small" color="primary" />
            <Chip label="Preferences" size="small" color="primary" />
            <Chip label="Result" size="small" color="primary" />
            <Chip label="No login" size="small" color="success" />
            <Chip label="Local-first" size="small" color="info" />
          </Box>

          {section(
            '1) What PIKME does',
            <>
              {bullet(
                <>
                  Helps your group pick a board game using a calm 4-step wizard.
                </>
              )}
              {bullet(
                <>
                  No server, no account — everything is stored in <Chip label="IndexedDB" size="small" color="info" />.
                </>
              )}
            </>,
          )}

          {section(
            '2) Step 1 — Players',
            <>
              {bullet(
                <>
                  Add people by <Chip label="BGG username" size="small" /> or as a <Chip label="local user" size="small" />.
                </>
              )}
              {bullet(
                <>
                  Import owned games and build a <Chip label="union" size="small" /> of everyone’s collections.
                </>
              )}
            </>,
          )}

          {section(
            '3) Step 2 — Filters',
            <>
              {bullet(
                <>
                  Narrow games by <Chip label="players" size="small" /> and <Chip label="time" size="small" />.
                </>
              )}
              {bullet(
                <>
                  Choose <Chip label="Coop" size="small" /> / <Chip label="Competitive" size="small" /> or no preference.
                </>
              )}
              {bullet(
                <>If you get 0 games, loosen filters (increase time / players, remove exclusions).</> )}
            </>,
          )}

          {section(
            '4) Step 3 — Preferences',
            <>
              {bullet(
                <>
                  Use drag & drop to organize games into <Chip label="Top Picks" size="small" color="secondary" />,
                  <Chip label="Ranked" size="small" color="secondary" /> and <Chip label="Neutral" size="small" color="secondary" />.
                </>
              )}
              {bullet(
                <>
                  <Chip label="Dislike" size="small" color="error" /> is a <strong>veto</strong>: the game is excluded from recommendations.
                </>
              )}
              {bullet(
                <>You can leave games unranked — the app treats them as neutral.</>
              )}
            </>,
          )}

          {section(
            '5) Step 4 — Result',
            <>
              {bullet(
                <>See a “Tonight’s pick” plus alternatives and the reasons it fits your constraints.</>
              )}
              {bullet(
                <>
                  Use <Chip label="Save game night" size="small" color="success" /> to store a snapshot locally.
                </>
              )}
            </>,
          )}

          {section(
            '6) BGG API key (optional)',
            <>
              {bullet(
                <>
                  Without a key: adding games via <Chip label="BGG link" size="small" /> still works (HTML scrape mode).
                </>
              )}
              {bullet(
                <>
                  With a key: better reliability for <Chip label="search" size="small" /> and <Chip label="BGG username import" size="small" />.
                </>
              )}
            </>,
            { ref: settingsRef },
          )}

          {section(
            '7) Local storage & privacy',
            <>
              {bullet(
                <>
                  Data is stored in this browser only. Switching devices/browsers won’t carry data over.
                </>
              )}
              {bullet(
                <>
                  Hostnames matter: <Chip label="pikme.online" size="small" /> and <Chip label="www.pikme.online" size="small" /> are separate stores.
                </>
              )}
            </>,
          )}

          {section(
            '8) Clear all data',
            <>
              {bullet(
                <>
                  This deletes the local database for this site in this browser.
                  <Chip label="Cannot be undone" size="small" color="error" sx={{ ml: 1 }} />
                </>
              )}
            </>,
            { ref: clearRef },
          )}

          {section(
            '9) Troubleshooting',
            <>
              {bullet(
                <>
                  If an import/scrape fails: try again first — slow network or rate limits can cause a temporary failure.
                </>
              )}
              {bullet(
                <>
                  For repeated issues: consider adding a <Chip label="BGG API key" size="small" /> in Settings.
                </>
              )}
            </>,
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
