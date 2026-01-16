/**
 * LocalOwnerGate
 *
 * Ensures a local owner exists before showing the app.
 * Shows the setup dialog when no local owner is found.
 *
 * See Requirements/user-journeys.md Section 2 for the flow.
 *
 * This gate should be placed AFTER DbGate (DB must be ready first)
 * but BEFORE the main app routes.
 *
 * Exception: Session join routes (/join/:code) bypass this gate
 * because the invite flow handles identity claiming differently.
 */

import { type PropsWithChildren, useState, useCallback } from 'react'
import { Box, CircularProgress, Container, Typography } from '@mui/material'
import { useLocalOwner } from '../../hooks/useLocalOwner'
import { LocalOwnerSetupDialog } from '../LocalOwnerSetupDialog'

export interface LocalOwnerGateProps extends PropsWithChildren {
  /**
   * If true, skip the local owner check (used for session join flow).
   * The invite flow handles identity differently.
   */
  bypass?: boolean
}

/**
 * Gate component that ensures local owner exists.
 * Shows loading state, then either setup dialog or children.
 */
export function LocalOwnerGate({ children, bypass = false }: LocalOwnerGateProps) {
  const { isLoading, hasLocalOwner } = useLocalOwner()
  const [setupComplete, setSetupComplete] = useState(false)

  // Show dialog after loading completes and no local owner found
  const shouldShowSetup = !isLoading && !hasLocalOwner && !setupComplete

  const handleSetupComplete = useCallback(() => {
    setSetupComplete(true)
  }, [])

  // Bypass check for session join flow
  if (bypass) {
    return <>{children}</>
  }

  // Still loading from database
  if (isLoading) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={24} />
            <Typography>Loading...</Typography>
          </Box>
        </Box>
      </Container>
    )
  }

  // Local owner exists or setup just completed
  if (hasLocalOwner || setupComplete) {
    return <>{children}</>
  }

  // No local owner - show setup dialog
  return (
    <>
      <LocalOwnerSetupDialog open={shouldShowSetup} onComplete={handleSetupComplete} />
      {/* Show empty background while dialog is open */}
      <Container maxWidth="sm">
        <Box sx={{ minHeight: '60vh' }} />
      </Container>
    </>
  )
}
