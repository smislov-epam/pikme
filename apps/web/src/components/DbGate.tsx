import { type PropsWithChildren, useEffect, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Container, Link, Typography } from '@mui/material'
import { db } from '../db'

type DbGateState =
  | { status: 'checking' }
  | { status: 'ready' }
  | { status: 'failed'; title: string; details?: string }

function getErrorDetails(error: unknown): string | undefined {
  if (!error) return undefined
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message

  try {
    return JSON.stringify(error)
  } catch {
    return undefined
  }
}

function buildUserMessage(error: unknown): { title: string; details?: string } {
  const details = getErrorDetails(error)

  // Common cases seen in browsers / privacy modes.
  if (details?.toLowerCase().includes('indexeddb')) {
    return {
      title: 'Local storage is unavailable in this browser session.',
      details,
    }
  }

  if (details?.toLowerCase().includes('quota')) {
    return {
      title: 'Not enough storage space to save data locally.',
      details,
    }
  }

  return {
    title: 'PIKME cannot access local storage (IndexedDB).',
    details,
  }
}

export function DbGate({ children }: PropsWithChildren) {
  const [state, setState] = useState<DbGateState>({ status: 'checking' })

  useEffect(() => {
    let cancelled = false

    db.open()
      .then(() => {
        if (cancelled) return
        setState({ status: 'ready' })
      })
      .catch((error) => {
        if (cancelled) return
        const message = buildUserMessage(error)
        setState({ status: 'failed', ...message })
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (state.status === 'ready') return children

  if (state.status === 'checking') {
    return (
      <Container maxWidth="sm">
        <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={24} />
            <Typography>Preparing local storage…</Typography>
          </Box>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center' }}>
        <Box sx={{ width: '100%' }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {state.title}
          </Alert>

          <Typography sx={{ mb: 2 }}>
            PIKME is a local-first app and requires IndexedDB. This can fail if storage is blocked (private mode,
            strict privacy settings) or if the site is not allowed to store data.
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            <Button variant="contained" onClick={() => window.location.reload()}>
              Try again
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                window.location.hash = 'storage-help'
              }}
            >
              Storage help
            </Button>
          </Box>

          {state.details ? (
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
              Details: {state.details}
            </Typography>
          ) : null}

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Tip: Make sure you always use the same hostname. For example,
            {' '}
            <Link href="https://pikme.online" target="_blank" rel="noreferrer">
              pikme.online
            </Link>
            {' '}and{' '}
            <Link href="https://www.pikme.online" target="_blank" rel="noreferrer">
              www.pikme.online
            </Link>
            {' '}have separate local storage.
          </Typography>
        </Box>
      </Box>
    </Container>
  )
}
