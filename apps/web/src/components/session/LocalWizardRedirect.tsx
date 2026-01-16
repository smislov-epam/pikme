/**
 * LocalWizardRedirect (REQ-103)
 *
 * Handles the "Create My Game Collection" flow for guests.
 * Sets up local owner, imports preferences, and redirects to wizard.
 */

import { useEffect, useState } from 'react';
import { CircularProgress, Stack, Typography } from '@mui/material';

export interface LocalWizardRedirectProps {
  sessionId: string;
}

/**
 * Component that handles "Create My Game Collection" flow:
 * 1. Creates local owner if needed (using display name from slot)
 * 2. Imports shared preferences if user claimed a named slot
 * 3. Adds session games to local owner's collection
 * 4. Redirects to wizard at preferences step
 */
export function LocalWizardRedirect({ sessionId }: LocalWizardRedirectProps) {
  const [status, setStatus] = useState<string>('Setting up...');

  useEffect(() => {
    async function setupLocalOwnerAndRedirect() {
      try {
        const { db } = await import('../../db');
        const { createLocalOwner } = await import('../../hooks/useLocalOwner');
        const { addGameToUser } = await import('../../services/db/userGamesService');

        // Get display name and whether user claimed a named slot
        const displayName = localStorage.getItem('guestDisplayName') || 'Guest';
        const claimedNamedSlot = localStorage.getItem('guestClaimedNamedSlot') === 'true';
        const preferenceSource = localStorage.getItem('guestPreferenceSource') ?? 'host';
        
        setStatus(`Setting up profile for ${displayName}...`);

        // Check if local owner already exists
        let localOwner = await db.users.filter((u) => u.isLocalOwner === true && !u.isDeleted).first();

        if (!localOwner) {
          // Create local owner with the display name from the claimed slot
          localOwner = await createLocalOwner({ displayName });
          console.log('[LocalWizardRedirect] Created local owner:', localOwner.username);
        }

        // If user claimed a named slot with shared preferences, import them to the local owner
        if (claimedNamedSlot && preferenceSource !== 'local') {
          setStatus('Importing your preferences...');
          const { GUEST_USERNAME } = await import('../../hooks/useGuestPreferences');
          
          // Get any preferences that were imported for the guest user and transfer to local owner
          const guestPrefs = await db.userPreferences
            .where('username')
            .equals(GUEST_USERNAME)
            .toArray();
          
          if (guestPrefs.length > 0) {
            console.log(`[LocalWizardRedirect] Transferring ${guestPrefs.length} preferences from guest to ${localOwner.username}`);
            const now = new Date().toISOString();
            
            for (const pref of guestPrefs) {
              // Check if preference already exists for local owner
              const existing = await db.userPreferences
                .where('[username+bggId]')
                .equals([localOwner.username, pref.bggId])
                .first();
              
              if (!existing) {
                await db.userPreferences.put({
                  username: localOwner.username,
                  bggId: pref.bggId,
                  rank: pref.rank,
                  isTopPick: pref.isTopPick,
                  isDisliked: pref.isDisliked,
                  updatedAt: now,
                });
              }
            }
          }
        }

        // Add session games to local owner's collection
        setStatus('Adding session games to your collection...');

        let sessionGameIds: number[] = [];
        try {
          const rawIds = localStorage.getItem('guestSessionGameIds');
          const parsed = rawIds ? (JSON.parse(rawIds) as unknown) : [];
          if (Array.isArray(parsed)) {
            sessionGameIds = parsed.filter((id) => typeof id === 'number' && Number.isFinite(id));
          }
        } catch {
          sessionGameIds = [];
        }

        if (sessionGameIds.length > 0) {
          console.log(`[LocalWizardRedirect] Adding ${sessionGameIds.length} session games to ${localOwner.username}`);
          for (const bggId of sessionGameIds) {
            await addGameToUser(localOwner.username, bggId);
          }
        }

        // Store the session context for the wizard
        localStorage.setItem('sessionGuestMode', 'local');
        localStorage.setItem('activeSessionId', sessionId);

        // Redirect to wizard - it will show preferences step
        window.location.href = '/';
      } catch (err) {
        console.error('[LocalWizardRedirect] Setup failed:', err);
        setStatus('Setup failed. Redirecting...');
        // Still try to redirect on error
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      }
    }

    setupLocalOwnerAndRedirect();
  }, [sessionId]);

  return (
    <Stack alignItems="center" spacing={2} py={8}>
      <CircularProgress />
      <Typography>{status}</Typography>
    </Stack>
  );
}
