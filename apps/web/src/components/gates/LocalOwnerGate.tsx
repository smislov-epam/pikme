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

import { type PropsWithChildren, useState, useCallback, useEffect } from 'react'
import { Box, CircularProgress, Container, Typography } from '@mui/material'
import { useLocalOwner, createLocalOwner, linkLocalOwnerToFirebase } from '../../hooks/useLocalOwner'
import { LocalOwnerSetupDialog } from '../LocalOwnerSetupDialog'
import { useAuth } from '../../hooks/useAuth'

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
 * For authenticated users without local owner, auto-creates and links.
 */
export function LocalOwnerGate({ children, bypass = false }: LocalOwnerGateProps) {
  const { isLoading, hasLocalOwner, localOwner } = useLocalOwner()
  const { user, loading: authLoading, firebaseReady } = useAuth()
  const [setupComplete, setSetupComplete] = useState(false)
  const [autoCreating, setAutoCreating] = useState(false)

  // Auto-create local owner for authenticated users on new device/browser
  useEffect(() => {
    if (isLoading || authLoading || !firebaseReady) return
    if (hasLocalOwner || setupComplete || autoCreating) return
    if (!user) return // Not authenticated - show manual setup dialog

    // User is authenticated but no local owner - auto-create and link
    setAutoCreating(true)
    ;(async () => {
      try {
        await createLocalOwner({
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
        })
        await linkLocalOwnerToFirebase(user.uid)
        setSetupComplete(true)
      } catch (err) {
        console.error('[LocalOwnerGate] Failed to auto-create local owner:', err)
        // Fall back to manual setup dialog
      } finally {
        setAutoCreating(false)
      }
    })()
  }, [isLoading, authLoading, firebaseReady, hasLocalOwner, setupComplete, autoCreating, user])

  // If a local owner already exists, ensure it's linked to the current authenticated user.
  // This is important when Firebase auth is restored from persistence (user didn't visit LoginPage)
  // or when the local owner was created before registration.
  useEffect(() => {
    if (isLoading || authLoading || !firebaseReady) return
    if (!user) return
    if (!localOwner) return

    // Already linked to this user.
    if (localOwner.firebaseUid === user.uid) return

    // Link/overwrite to the signed-in user's UID. This device's local owner should map
    // to the currently authenticated account.
    ;(async () => {
      try {
        await linkLocalOwnerToFirebase(user.uid)
        setSetupComplete(true)
      } catch (err) {
        console.error('[LocalOwnerGate] Failed to link local owner to authenticated user:', err)
      }
    })()
  }, [isLoading, authLoading, firebaseReady, user, localOwner])

  // Show dialog after loading completes and no local owner found (only for non-authenticated)
  const shouldShowSetup = !isLoading && !authLoading && !hasLocalOwner && !setupComplete && !user && !autoCreating

  const handleSetupComplete = useCallback(() => {
    setSetupComplete(true)
  }, [])

  // Bypass check for session join flow
  if (bypass) {
    return <>{children}</>
  }

  // Still loading from database or auth, or auto-creating
  if (isLoading || authLoading || autoCreating) {
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
            <Typography>{autoCreating ? 'Setting up your profile...' : 'Loading...'}</Typography>
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
