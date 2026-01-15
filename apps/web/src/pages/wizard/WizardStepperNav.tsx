import { Box, ButtonBase, Paper, Stack, Typography, alpha, useMediaQuery, useTheme } from '@mui/material'
import { colors } from '../../theme/theme'
import { MobileStepperNav } from './MobileStepperNav'
import { wizardSteps } from './wizardSteps'

export function WizardStepperNav(props: {
  activeStep: number
  completedSteps: boolean[]
  stepSubtitles?: string[]
  compactBadgeCount?: number
  canJumpTo: (stepIndex: number) => boolean
  onSelectStep: (stepIndex: number) => void
}) {
  const { activeStep, completedSteps, stepSubtitles, compactBadgeCount, canJumpTo, onSelectStep } = props

  const theme = useTheme()
  const isNarrow = useMediaQuery(theme.breakpoints.down('sm'))

  if (isNarrow) {
    return <MobileStepperNav activeStep={activeStep} compactBadgeCount={compactBadgeCount} />
  }

  return (
    <Paper
      elevation={10}
      sx={{
        mb: 3,
        p: 1,
        borderRadius: 999,
        bgcolor: colors.warmWhite,
        border: '1px solid',
        borderColor: alpha(colors.oceanBlue, 0.18),
        boxShadow: `0 8px 20px ${alpha(colors.navyBlue, 0.12)}`,
        isolation: 'isolate',
        position: 'static',
        overflow: 'visible',
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{
          flexWrap: 'nowrap',
          overflowX: { xs: 'visible', sm: 'visible' },
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
                  display: 'flex',
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                  width: { xs: 150, sm: '100%' },
                  borderRadius: 999,
                  px: 1.25,
                  py: 0.75,
                  minHeight: 44,
                  border: 'none',
                  boxShadow:
                    isActive
                      ? `inset 0 0 0 2px ${colors.oceanBlue}`
                      : isCompleted
                        ? `inset 0 0 0 2px ${colors.sand}`
                        : `inset 0 0 0 1px ${alpha(colors.oceanBlue, 0.25)}`,
                  bgcolor: isActive ? colors.oceanBlue : 'transparent',
                  color: isActive ? 'white' : 'text.primary',
                  transition: 'background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease',
                  transform: 'translateZ(0)',
                  '&:hover': {
                    bgcolor: isActive ? colors.oceanBlue : alpha(colors.oceanBlue, 0.08),
                    boxShadow: disabled
                      ? 'none'
                      : isActive
                        ? `inset 0 0 0 2px ${colors.oceanBlue}`
                        : isCompleted
                          ? `inset 0 0 0 2px ${colors.sand}`
                          : `inset 0 0 0 1px ${alpha(colors.oceanBlue, 0.35)}`,
                  },
                  opacity: disabled ? 0.45 : 1,
                }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  justifyContent="flex-start"
                  sx={{ lineHeight: 1, width: '100%', textAlign: 'left' }}
                >
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
                      textAlign: 'left',
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
                        textAlign: 'left',
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
                    height: 4,
                    borderRadius: 999,
                    mx: 1,
                    flex: 1,
                    minWidth: { xs: 20, sm: 28 },
                    bgcolor: connectorIsDone ? colors.sand : alpha(colors.oceanBlue, 0.18),
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
