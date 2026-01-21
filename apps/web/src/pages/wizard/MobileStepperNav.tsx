import { Box, Paper, Stack, Typography, alpha, keyframes } from '@mui/material'
import LockIcon from '@mui/icons-material/Lock'
import CheckIcon from '@mui/icons-material/Check'
import { Fragment } from 'react'
import { colors } from '../../theme/theme'
import { wizardSteps, wizardStepsShort } from './wizardSteps'

export interface MobileStepperNavProps {
  activeStep: number
  compactBadgeCount?: number
  /** Steps that are locked (e.g., in session guest mode) - array of step indices */
  lockedSteps?: number[]
}

/** Circle size and connector dimensions */
const CIRCLE_SIZE = 36
const CONNECTOR_HEIGHT = 4
const BORDER_WIDTH = 3

/** Pulse animation for active step */
const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 ${alpha(colors.oceanBlue, 0.4)}; }
  50% { box-shadow: 0 0 0 6px ${alpha(colors.oceanBlue, 0)}; }
`

/** Fixed width for each label to prevent layout jumping */
const LABEL_WIDTHS: Record<number, number> = {
  0: 60, // "Players"
  1: 50, // "Filters"
  2: 42, // "Prefs"
  3: 50, // "Result"
}

/** Returns gradient background for step circle */
function getCircleGradient(stepIndex: number, activeStep: number, isLocked: boolean): string {
  void isLocked
  if (stepIndex < activeStep) return `linear-gradient(135deg, ${colors.sand} 0%, #D4A72C 100%)`
  if (stepIndex === activeStep) return `linear-gradient(135deg, ${colors.oceanBlue} 0%, ${colors.navyBlue} 100%)`
  return 'transparent'
}

/** Returns the border color for a step circle */
function getCircleBorderColor(stepIndex: number, activeStep: number, isLocked: boolean): string {
  void isLocked
  if (stepIndex < activeStep) return 'transparent'
  if (stepIndex === activeStep) return 'transparent'
  return alpha(colors.oceanBlue, 0.3)
}

/** Returns the text color for a step circle */
function getCircleTextColor(stepIndex: number, activeStep: number, isLocked: boolean): string {
  void isLocked
  if (stepIndex < activeStep) return '#FFFFFF'
  if (stepIndex === activeStep) return '#FFFFFF'
  return alpha(colors.oceanBlue, 0.5)
}

/** Returns the connector gradient between two steps */
function getConnectorGradient(leftIndex: number, activeStep: number): string {
  const isLeftCompleted = leftIndex < activeStep
  const isRightCompleted = leftIndex + 1 < activeStep
  const isRightActive = leftIndex + 1 === activeStep

  if (isLeftCompleted && isRightCompleted) {
    return `linear-gradient(90deg, ${colors.sand} 0%, ${colors.sand} 100%)`
  }
  if (isLeftCompleted && isRightActive) {
    return `linear-gradient(90deg, ${colors.sand} 0%, ${colors.oceanBlue} 100%)`
  }
  if (isLeftCompleted) {
    return `linear-gradient(90deg, ${colors.sand} 0%, ${alpha(colors.oceanBlue, 0.25)} 100%)`
  }
  return alpha(colors.oceanBlue, 0.2)
}

export function MobileStepperNav({ activeStep, compactBadgeCount = 0, lockedSteps = [] }: MobileStepperNavProps) {
  const shortLabel = wizardStepsShort[activeStep] ?? 'Step'
  const labelWidth = LABEL_WIDTHS[activeStep] ?? 48

  return (
    <Paper
      elevation={10}
      sx={{
        mb: 2,
        px: { xs: 1.5, sm: 2 },
        py: 1,
        borderRadius: 999,
        bgcolor: alpha(colors.warmWhite, 0.95),
        border: '1px solid',
        borderColor: alpha(colors.oceanBlue, 0.15),
        backdropFilter: 'blur(10px)',
        boxShadow: `0 8px 24px ${alpha(colors.navyBlue, 0.12)}`,
        width: '100%',
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        {/* Step circles with connectors */}
        <Stack direction="row" alignItems="center" flex={1}>
          {wizardSteps.map((_, stepIndex) => {
            const isActive = stepIndex === activeStep
            const isCompleted = stepIndex < activeStep
            const isLast = stepIndex === wizardSteps.length - 1
            const isLocked = lockedSteps.includes(stepIndex)

            return (
              <Fragment key={stepIndex}>
                {/* Step circle with optional active border wrapper */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: 999,
                    border: isActive && !isLocked ? `${BORDER_WIDTH}px solid ${colors.oceanBlue}` : 'none',
                    pl: isActive && !isLocked ? 0.5 : 0,
                    pr: isActive && !isLocked ? 1.25 : 0,
                    py: isActive && !isLocked ? 0.5 : 0,
                    flexShrink: 0,
                    bgcolor: isActive && !isLocked ? alpha(colors.oceanBlue, 0.06) : 'transparent',
                    transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: isActive ? 'scale(1.02)' : 'scale(1)',
                  }}
                >
                  <Box
                    sx={{
                      width: CIRCLE_SIZE,
                      height: CIRCLE_SIZE,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: getCircleGradient(stepIndex, activeStep, isLocked),
                      border: !isActive && !isCompleted && !isLocked
                        ? `${BORDER_WIDTH}px solid ${getCircleBorderColor(stepIndex, activeStep, isLocked)}`
                        : 'none',
                      color: isLocked ? '#FFFFFF' : getCircleTextColor(stepIndex, activeStep, isLocked),
                      fontSize: '1rem',
                      fontWeight: 900,
                      flexShrink: 0,
                      boxSizing: 'border-box',
                      boxShadow: isActive
                        ? `0 4px 12px ${alpha(colors.oceanBlue, 0.35)}`
                        : isCompleted
                          ? `0 4px 12px ${alpha(colors.sand, 0.35)}`
                          : 'none',
                      animation: isActive ? `${pulseGlow} 2s ease-in-out infinite` : 'none',
                      transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    {isLocked ? (
                      <LockIcon sx={{ fontSize: 16 }} />
                    ) : isCompleted ? (
                      <CheckIcon sx={{ fontSize: 18 }} />
                    ) : (
                      stepIndex + 1
                    )}
                  </Box>

                  {/* Active step label inside the bordered pill */}
                  {isActive && !isLocked && (
                    <Typography
                      component="span"
                      sx={{
                        ml: 0.75,
                        width: labelWidth,
                        fontWeight: 900,
                        letterSpacing: '-0.01em',
                        fontSize: '0.95rem',
                        whiteSpace: 'nowrap',
                        textAlign: 'center',
                        color: colors.oceanBlue,
                        transition: 'all 250ms ease',
                      }}
                    >
                      {shortLabel}
                    </Typography>
                  )}
                </Box>

                {/* Connector after this step (except last) */}
                {!isLast && (
                  <Box
                    sx={{
                      flex: 1,
                      minWidth: 12,
                      height: CONNECTOR_HEIGHT,
                      borderRadius: 999,
                      background: getConnectorGradient(stepIndex, activeStep),
                      transition: 'background 400ms ease',
                    }}
                  />
                )}
              </Fragment>
            )
          })}
        </Stack>

        {/* Game count badge */}
        <Box
          role="status"
          aria-label="Games count"
          sx={{
            ml: 1.5,
            width: 32,
            height: 32,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, ${alpha(colors.oceanBlue, 0.15)} 0%, ${alpha(colors.sand, 0.15)} 100%)`,
            border: '2px solid',
            borderColor: alpha(colors.oceanBlue, 0.25),
            color: colors.navyBlue,
            fontWeight: 900,
            fontSize: '0.85rem',
            flexShrink: 0,
            transition: 'all 250ms ease',
          }}
        >
          {compactBadgeCount}
        </Box>
      </Stack>
    </Paper>
  )
}
