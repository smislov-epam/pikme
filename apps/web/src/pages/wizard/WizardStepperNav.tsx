import { Box, ButtonBase, Paper, Stack, Typography, alpha } from '@mui/material'
import { colors } from '../../theme/theme'
import { wizardSteps } from './wizardSteps'

export function WizardStepperNav(props: {
  activeStep: number
  completedSteps: boolean[]
  stepSubtitles?: string[]
  canJumpTo: (stepIndex: number) => boolean
  onSelectStep: (stepIndex: number) => void
}) {
  const { activeStep, completedSteps, stepSubtitles, canJumpTo, onSelectStep } = props

  return (
    <Paper
      elevation={10}
      sx={{
        mb: 3,
        p: 1,
        borderRadius: 999,
        bgcolor: alpha(colors.warmWhite, 0.92),
        border: '1px solid',
        borderColor: alpha(colors.oceanBlue, 0.18),
        backdropFilter: 'blur(10px)',
        boxShadow: `0 10px 28px ${alpha(colors.navyBlue, 0.15)}`,
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{
          flexWrap: 'nowrap',
          overflowX: { xs: 'auto', sm: 'visible' },
          overflowY: 'hidden',
          scrollbarGutter: 'stable',
        }}
      >
        {wizardSteps.map((label, index) => {
          const isActive = activeStep === index
          const isCompleted = !!completedSteps[index]
          const disabled = !canJumpTo(index)
          const connectorIsDone = index < activeStep

          return (
            <Box key={label} sx={{ display: 'flex', alignItems: 'center', flex: { xs: '0 0 auto', sm: 1 } }}>
              <ButtonBase
                disabled={disabled}
                onClick={() => onSelectStep(index)}
                sx={{
                  width: { xs: 150, sm: '100%' },
                  borderRadius: 999,
                  px: 1.25,
                  py: 0.75,
                  minHeight: 44,
                  border: '1px solid',
                  borderColor: isActive
                    ? alpha(colors.oceanBlue, 0.55)
                    : isCompleted
                      ? alpha(colors.sand, 0.95)
                      : alpha(colors.oceanBlue, 0.22),
                  bgcolor: isActive ? colors.oceanBlue : 'transparent',
                  color: isActive ? 'white' : 'text.primary',
                  transition: 'background-color 140ms ease, border-color 140ms ease, transform 140ms ease',
                  '&:hover': {
                    bgcolor: isActive ? colors.oceanBlue : alpha(colors.oceanBlue, 0.08),
                    transform: disabled ? 'none' : 'translateY(-1px)',
                  },
                  '&:active': {
                    transform: disabled ? 'none' : 'translateY(0px)',
                  },
                  opacity: disabled ? 0.45 : 1,
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ lineHeight: 1, width: '100%' }}>
                  <Box
                    sx={{
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: isActive ? colors.sand : alpha(colors.sand, 0.45),
                      color: colors.navyBlue,
                      fontSize: '0.78rem',
                      fontWeight: 900,
                      flexShrink: 0,
                    }}
                  >
                    {index + 1}
                  </Box>

                  <Typography
                    component="span"
                    sx={{
                      fontWeight: isActive ? 900 : 700,
                      letterSpacing: '-0.01em',
                      fontSize: { xs: '0.9rem', sm: '0.95rem' },
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {label}
                  </Typography>

                  {stepSubtitles?.[index] ? (
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{
                        opacity: isActive ? 0.9 : 0.75,
                        fontWeight: 700,
                        color: isActive ? 'rgba(255,255,255,0.92)' : alpha(colors.navyBlue, 0.72),
                        whiteSpace: 'nowrap',
                        ml: 'auto',
                      }}
                    >
                      {stepSubtitles[index]}
                    </Typography>
                  ) : null}
                </Stack>
              </ButtonBase>

              {index < wizardSteps.length - 1 ? (
                <Box
                  aria-hidden
                  sx={{
                    height: 3,
                    borderRadius: 999,
                    mx: 1,
                    flex: 1,
                    minWidth: { xs: 16, sm: 24 },
                    bgcolor: connectorIsDone ? alpha(colors.sand, 0.95) : alpha(colors.oceanBlue, 0.18),
                  }}
                />
              ) : null}
            </Box>
          )
        })}
      </Stack>
    </Paper>
  )
}
