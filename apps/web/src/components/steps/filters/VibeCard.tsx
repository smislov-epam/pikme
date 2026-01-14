import { Box, Card, CardContent, Stack, ToggleButton, ToggleButtonGroup, Typography, useMediaQuery, useTheme } from '@mui/material'
import PsychologyIcon from '@mui/icons-material/Psychology'
import HandshakeIcon from '@mui/icons-material/Handshake'
import SportsKabaddiIcon from '@mui/icons-material/SportsKabaddi'
import CasinoIcon from '@mui/icons-material/Casino'

type Mode = 'coop' | 'competitive' | 'any'

type Props = {
  mode: Mode
  onModeChange: (mode: Mode) => void
}

export function VibeCard({ mode, onModeChange }: Props) {
  const theme = useTheme()
  const isNarrow = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" gap={1} mb={2}>
          <PsychologyIcon color="primary" />
          <Typography variant="subtitle1" fontWeight={600}>
            What's the vibe?
          </Typography>
        </Stack>

        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_, v) => v && onModeChange(v)}
          fullWidth
          sx={{ '& .MuiToggleButton-root': { py: 1, minHeight: 56 } }}
        >
          <ToggleButton value="coop">
            {isNarrow ? (
              <Box sx={{ textAlign: 'center' }}>
                <HandshakeIcon fontSize="small" />
                <Typography variant="caption" display="block" fontWeight={700}>
                  Co-op
                </Typography>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 0.5 }}>
                <Typography fontWeight={600}>🤝 Coop</Typography>
                <Typography variant="caption" color="text.secondary">
                  Work together
                </Typography>
              </Box>
            )}
          </ToggleButton>

          <ToggleButton value="competitive">
            {isNarrow ? (
              <Box sx={{ textAlign: 'center' }}>
                <SportsKabaddiIcon fontSize="small" />
                <Typography variant="caption" display="block" fontWeight={700}>
                  Competitive
                </Typography>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 0.5 }}>
                <Typography fontWeight={600}>⚔️ Competitive</Typography>
                <Typography variant="caption" color="text.secondary">
                  Every player for themselves
                </Typography>
              </Box>
            )}
          </ToggleButton>

          <ToggleButton value="any">
            {isNarrow ? (
              <Box sx={{ textAlign: 'center' }}>
                <CasinoIcon fontSize="small" />
                <Typography variant="caption" display="block" fontWeight={700}>
                  Any
                </Typography>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 0.5 }}>
                <Typography fontWeight={600}>🎲 Any</Typography>
                <Typography variant="caption" color="text.secondary">
                  No preference
                </Typography>
              </Box>
            )}
          </ToggleButton>
        </ToggleButtonGroup>
      </CardContent>
    </Card>
  )
}
