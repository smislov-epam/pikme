import { Box, ButtonBase, Paper, Stack, Typography, alpha, useMediaQuery, useTheme, keyframes } from '@mui/material'
import LockIcon from '@mui/icons-material/Lock'
import CheckIcon from '@mui/icons-material/Check'
import { colors } from '../../theme/theme'
import { MobileStepperNav } from './MobileStepperNav'
import { wizardSteps } from './wizardSteps'

/** Consistent thickness for circles, borders, and connectors */
const CIRCLE_SIZE = 36
const BORDER_WIDTH = 3
const CONNECTOR_HEIGHT = BORDER_WIDTH

/** Pulse animation for active step */
const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 ${alpha(colors.oceanBlue, 0.4)}; }
  50% { box-shadow: 0 0 0 4px ${alpha(colors.oceanBlue, 0)}; }
`

/** 
 * Returns gradient for pill border based on step state
 * - Completed: yellow
 * - Active: yellow (with blue background inside)
 * - Upcoming: solid blue outline (white background inside)
 */
function getPillBorderGradient(isActive: boolean, isCompleted: boolean, isLocked: boolean): string {
  void isLocked
  if (isCompleted) return colors.sand // Solid yellow for completed
  if (isActive) return colors.sand // Yellow border for active
  return colors.oceanBlue // Solid blue border for upcoming
}

/** Returns gradient background for step circle */
function getCircleGradient(isActive: boolean, isCompleted: boolean, isLocked: boolean): string {
  void isLocked
  if (isActive) return `linear-gradient(135deg, ${colors.sand} 0%, #D4A72C 100%)` // Yellow circle for active
  if (isCompleted) return 'transparent' // Transparent - white border will show
  // Upcoming: solid blue fill
  return colors.oceanBlue
}

/** Returns connector gradient based on step states - seamless color flow */
function getConnectorGradient(leftIndex: number, activeStep: number): string {
  const isLeftCompleted = leftIndex < activeStep
  const isRightCompleted = leftIndex + 1 < activeStep
  const isRightActive = leftIndex + 1 === activeStep
  const isLeftActive = leftIndex === activeStep

  // Both completed: yellow
  if (isLeftCompleted && isRightCompleted) {
    return colors.sand
  }
  // Left completed, right is active: yellow (both have yellow borders)
  if (isLeftCompleted && isRightActive) {
    return colors.sand
  }
  // Left is active: yellow to blue (active has yellow border, upcoming has blue)
  if (isLeftActive) {
    return `linear-gradient(90deg, ${colors.sand} 0%, ${colors.oceanBlue} 100%)`
  }
  // Both upcoming: solid blue
  return colors.oceanBlue
}

export function WizardStepperNav(props: {
  activeStep: number
  completedSteps: boolean[]
  stepSubtitles?: string[]
  compactBadgeCount?: number
  canJumpTo: (stepIndex: number) => boolean
  onSelectStep: (stepIndex: number) => void
  /** Steps that are locked (e.g., in session guest mode) - array of step indices */
  lockedSteps?: number[]
}) {
  const { activeStep, completedSteps, stepSubtitles, compactBadgeCount, canJumpTo, onSelectStep, lockedSteps = [] } = props

  const theme = useTheme()
  const isNarrow = useMediaQuery(theme.breakpoints.down('sm'))

  if (isNarrow) {
    return <MobileStepperNav activeStep={activeStep} compactBadgeCount={compactBadgeCount} lockedSteps={lockedSteps} />
  }

  return (
    <Paper
      elevation={10}
      sx={{
        mb: 3,
        py: 0.75,
        px: 1.5,
        borderRadius: 999,
        bgcolor: colors.warmWhite,
        border: '1px solid',
        borderColor: alpha(colors.oceanBlue, 0.12),
        boxShadow: `0 6px 20px ${alpha(colors.navyBlue, 0.1)}`,
        overflow: 'visible',
      }}
    >
      <Stack direction="row" alignItems="center">
        {wizardSteps.map((label, index) => {
          const isActive = activeStep === index
          const isCompleted = index < activeStep
          const isTouched = completedSteps[index] || isCompleted || isActive
          const isLocked = lockedSteps.includes(index)
          const disabled = !canJumpTo(index) || isLocked
          const isLast = index === wizardSteps.length - 1
          const borderGradient = getPillBorderGradient(isActive, isCompleted, isLocked)

          return (
            <Box
              key={label}
              sx={{
                display: 'flex',
                alignItems: 'center',
                flex: 1,
              }}
            >
              {/* Step pill with gradient border */}
              <Box
                sx={{
                  position: 'relative',
                  borderRadius: 999,
                  p: `${BORDER_WIDTH}px`,
                  background: borderGradient,
                  transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: isActive ? 'scale(1.02)' : 'scale(1)',
                  animation: isActive ? `${pulseGlow} 2s ease-in-out infinite` : 'none',
                  '&:hover': {
                    transform: disabled ? 'scale(1)' : 'scale(1.02)',
                  },
                }}
              >
                <ButtonBase
                  disabled={disabled}
                  onClick={() => onSelectStep(index)}
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    borderRadius: 999,
                    pl: 0.5,
                    pr: 1.25,
                    py: 0.25,
                    minHeight: 40,
                    bgcolor: isActive 
                      ? colors.oceanBlue 
                      : isCompleted 
                        ? colors.sand 
                        : colors.warmWhite,
                    transition: 'all 200ms ease',
                    '&:hover': disabled
                      ? {
                          bgcolor: isActive
                            ? colors.oceanBlue
                            : isCompleted
                              ? colors.sand
                              : colors.warmWhite,
                        }
                      : {
                          bgcolor: isTouched
                            ? alpha(colors.sand, 0.85)
                            : alpha(colors.oceanBlue, 0.04),
                        },
                    cursor: isLocked ? 'not-allowed' : disabled ? 'default' : 'pointer',
                  }}
                >
                  {/* Circle with number or icon */}
                  <Box
                    sx={{
                      width: CIRCLE_SIZE,
                      height: CIRCLE_SIZE,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: getCircleGradient(isActive, isCompleted, isLocked),
                      border: isCompleted 
                        ? '2px solid #FFFFFF' 
                        : 'none',
                      color: '#FFFFFF',
                      fontSize: '0.95rem',
                      fontWeight: 900,
                      flexShrink: 0,
                      boxShadow: isCompleted
                        ? `0 2px 8px ${alpha(colors.sand, 0.3)}`
                        : 'none',
                      transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    {isLocked ? (
                      <LockIcon sx={{ fontSize: 14 }} />
                    ) : isCompleted ? (
                      <CheckIcon sx={{ fontSize: 16 }} />
                    ) : (
                      index + 1
                    )}
                  </Box>

                  {/* Label */}
                  <Typography
                    component="span"
                    sx={{
                      ml: 1,
                      fontWeight: isActive ? 900 : 700,
                      letterSpacing: '-0.01em',
                      fontSize: '0.9rem',
                      whiteSpace: 'nowrap',
                      color: (isActive || isCompleted)
                        ? '#FFFFFF'
                        : colors.oceanBlue,
                      transition: 'color 200ms ease',
                    }}
                  >
                    {label}
                  </Typography>

                  {/* Subtitle if provided */}
                  {stepSubtitles?.[index] && (
                    <Typography
                      component="span"
                      sx={{
                        ml: 0.75,
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        whiteSpace: 'nowrap',
                        color: (isActive || isCompleted)
                          ? alpha('#FFFFFF', 0.8)
                          : alpha(colors.navyBlue, 0.5),
                      }}
                    >
                      {stepSubtitles[index]}
                    </Typography>
                  )}
                </ButtonBase>
              </Box>

              {/* Connector line (not after last step) - touches pills seamlessly */}
              {!isLast && (
                <Box
                  aria-hidden
                  sx={{
                    flex: 1,
                    height: CONNECTOR_HEIGHT,
                    minWidth: 12,
                    mx: 0,
                    borderRadius: 0,
                    background: getConnectorGradient(index, activeStep),
                    transition: 'background 400ms ease',
                  }}
                />
              )}
            </Box>
          )
        })}
      </Stack>
    </Paper>
  )
}
