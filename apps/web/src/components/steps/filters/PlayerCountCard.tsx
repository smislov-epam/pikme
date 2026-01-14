import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Box, Card, CardContent, Chip, Collapse, Stack, Typography, alpha } from '@mui/material'
import GroupsIcon from '@mui/icons-material/Groups'
import { colors } from '../../../theme/theme'
import { playerCountChipTone } from '../../../services/ui/playerCountChipTone'

type Props = {
  sessionUserCount: number
  playerCount: number
  onPlayerCountChange: (count: number) => void
}

const BASE_COUNTS = Array.from({ length: 11 }, (_, i) => i + 2) // 2..12
const EXTENDED_COUNTS = Array.from({ length: 8 }, (_, i) => i + 13) // 13..20

export function PlayerCountCard({ sessionUserCount, playerCount, onPlayerCountChange }: Props) {
  const [expanded, setExpanded] = useState<boolean>(playerCount >= 13)
  const [manualOverride, setManualOverride] = useState(false)
  const prevSessionUserCountRef = useRef<number | null>(null)

  useEffect(() => {
    if (sessionUserCount <= 0) return

    const prev = prevSessionUserCountRef.current
    prevSessionUserCountRef.current = sessionUserCount

    // Auto-follow Players roster changes unless user manually overrides.
    // Only auto-update if the current selection still matches the previous roster size.
    if (!manualOverride && (prev === null || playerCount === prev) && playerCount !== sessionUserCount) {
      onPlayerCountChange(sessionUserCount)
    }
  }, [manualOverride, onPlayerCountChange, playerCount, sessionUserCount])

  const extendedOpen = expanded || playerCount >= 13

  const mismatchHint = useMemo(() => {
    if (sessionUserCount <= 0) return null
    if (playerCount <= sessionUserCount) return null
    return `You selected ${playerCount} players, but only ${sessionUserCount} profiles are configured.`
  }, [playerCount, sessionUserCount])

  const chipSx = (count: number) => {
    const tone = playerCountChipTone({ count, selectedCount: playerCount, sessionUserCount })

    if (tone === 'selected') {
      return {
        height: 40,
        minWidth: 44,
        fontWeight: 700,
        bgcolor: alpha(colors.sand, 0.65),
        color: colors.navyBlue,
        borderColor: alpha(colors.sand, 0.95),
        '&:hover': { bgcolor: alpha(colors.sand, 0.8) },
      }
    }

    if (tone === 'inSession') {
      return {
        height: 40,
        minWidth: 44,
        fontWeight: 700,
        bgcolor: alpha(colors.skyBlue, 0.22),
        color: colors.navyBlue,
        borderColor: alpha(colors.skyBlue, 0.35),
        '&:hover': { bgcolor: alpha(colors.skyBlue, 0.32) },
      }
    }

    return {
      height: 40,
      minWidth: 44,
      fontWeight: 700,
      bgcolor: alpha(colors.navyBlue, 0.03),
      color: alpha(colors.navyBlue, 0.45),
      borderColor: alpha(colors.navyBlue, 0.16),
      '&:hover': { bgcolor: alpha(colors.navyBlue, 0.06) },
    }
  }

  const isExtendedSelected = playerCount >= 13

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" gap={1} mb={2}>
          <GroupsIcon color="primary" />
          <Typography variant="subtitle1" fontWeight={600}>
            How many players?
          </Typography>
        </Stack>

        {sessionUserCount > 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Based on your Players step ({sessionUserCount} in the session).
          </Typography>
        ) : null}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
          {BASE_COUNTS.map((count) => (
            <Chip
              key={count}
              label={count}
              onClick={() => {
                setManualOverride(true)
                onPlayerCountChange(count)
              }}
              variant="outlined"
              sx={chipSx(count)}
            />
          ))}

          <Chip
            label="12+"
            onClick={() => {
              // When a 13+ count is selected, keep the extended range visible
              // so the selected chip remains in view.
              if (playerCount >= 13) {
                setExpanded(true)
                return
              }
              setExpanded((v) => !v)
            }}
            variant="outlined"
            sx={
              isExtendedSelected
                ? {
                    ...chipSx(playerCount),
                    minWidth: 56,
                  }
                : {
                    ...chipSx(13),
                    minWidth: 56,
                  }
            }
            aria-expanded={extendedOpen ? 'true' : 'false'}
          />
        </Box>

        <Collapse in={extendedOpen} mountOnEnter unmountOnExit>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, pt: 0.5 }}>
            {EXTENDED_COUNTS.map((count) => (
              <Chip
                key={count}
                label={count}
                onClick={() => {
                  setManualOverride(true)
                  onPlayerCountChange(count)
                }}
                variant="outlined"
                sx={chipSx(count)}
              />
            ))}
          </Box>
        </Collapse>

        {mismatchHint ? (
          <Alert severity="info" sx={{ mt: 2, borderRadius: 3 }}>
            {mismatchHint}
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  )
}
