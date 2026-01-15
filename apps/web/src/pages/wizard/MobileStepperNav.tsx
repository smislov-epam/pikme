import { Box, Paper, Stack, Typography, alpha } from '@mui/material'
import { Fragment } from 'react'
import { colors } from '../../theme/theme'
import { wizardSteps, wizardStepsShort } from './wizardSteps'

export interface MobileStepperNavProps {
  activeStep: number
  compactBadgeCount?: number
}

/** Circle size and connector dimensions */
const CIRCLE_SIZE = 30
const CONNECTOR_WIDTH = 6
const BORDER_WIDTH = 3

/** Fixed width for each label to prevent layout jumping */
const LABEL_WIDTHS: Record<number, number> = {
  0: 54, // "Players"
  1: 46, // "Filters"
  2: 38, // "Prefs"
  3: 46, // "Result"
}

/** Returns the background color for a step circle */
function getCircleBgColor(stepIndex: number, activeStep: number): string {
  if (stepIndex < activeStep) return colors.sand // Completed
  if (stepIndex === activeStep) return colors.oceanBlue // Active
  return 'transparent' // Upcoming
}

/** Returns the border color for a step circle */
function getCircleBorderColor(stepIndex: number, activeStep: number): string {
  if (stepIndex < activeStep) return colors.sand // Completed
  if (stepIndex === activeStep) return colors.oceanBlue // Active
  return alpha(colors.oceanBlue, 0.25) // Upcoming
}

/** Returns the text color for a step circle */
function getCircleTextColor(stepIndex: number, activeStep: number): string {
  if (stepIndex < activeStep) return colors.navyBlue // Completed
  if (stepIndex === activeStep) return '#FFFFFF' // Active
  return alpha(colors.oceanBlue, 0.45) // Upcoming
}

/** Returns the connector background style between two steps */
function getConnectorBg(leftIndex: number, activeStep: number): string {
  const isLeftCompleted = leftIndex < activeStep
  const isRightActive = leftIndex + 1 === activeStep

  if (isLeftCompleted && isRightActive) {
    // Gradient from completed (yellow) to active (blue)
    return `linear-gradient(to right, ${colors.sand}, ${colors.oceanBlue})`
  }
  if (isLeftCompleted) {
    // Both completed
    return colors.sand
  }
  // Active to upcoming, or upcoming to upcoming
  return alpha(colors.oceanBlue, 0.25)
}

export function MobileStepperNav({ activeStep, compactBadgeCount = 0 }: MobileStepperNavProps) {
  const shortLabel = wizardStepsShort[activeStep] ?? 'Step'
  const labelWidth = LABEL_WIDTHS[activeStep] ?? 48

  return (
    <Paper
      elevation={10}
      sx={{
        mb: 2,
        px: 1,
        py: 0.5,
        borderRadius: 999,
        bgcolor: alpha(colors.warmWhite, 0.92),
        border: '1px solid',
        borderColor: alpha(colors.oceanBlue, 0.18),
        backdropFilter: 'blur(10px)',
        boxShadow: `0 10px 28px ${alpha(colors.navyBlue, 0.15)}`,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        {/* Step circles with connectors - connectors flex equally */}
        <Stack direction="row" alignItems="center" flex={1}>
          {wizardSteps.map((_, stepIndex) => {
            const isActive = stepIndex === activeStep
            const isLast = stepIndex === wizardSteps.length - 1

            return (
              <Fragment key={stepIndex}>
                {/* Step circle with optional active border wrapper */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: 999,
                    border: isActive ? `${BORDER_WIDTH}px solid ${colors.oceanBlue}` : 'none',
                    pl: isActive ? 0.25 : 0,
                    pr: isActive ? 1 : 0,
                    py: isActive ? 0.25 : 0,
                    flexShrink: 0,
                  }}
                >
                  <Box
                    sx={{
                      width: CIRCLE_SIZE,
                      height: CIRCLE_SIZE,
                      borderRadius: 999,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: getCircleBgColor(stepIndex, activeStep),
                      border: isActive ? 'none' : `${BORDER_WIDTH}px solid`,
                      borderColor: getCircleBorderColor(stepIndex, activeStep),
                      color: getCircleTextColor(stepIndex, activeStep),
                      fontSize: '0.95rem',
                      fontWeight: 900,
                      flexShrink: 0,
                      boxSizing: 'border-box',
                    }}
                  >
                    {stepIndex + 1}
                  </Box>

                  {/* Active step label inside the bordered pill */}
                  {isActive && (
                    <Typography
                      component="span"
                      sx={{
                        ml: 0.5,
                        width: labelWidth,
                        fontWeight: 900,
                        letterSpacing: '-0.01em',
                        fontSize: '1rem',
                        whiteSpace: 'nowrap',
                        color: colors.navyBlue,
                      }}
                    >
                      {shortLabel}
                    </Typography>
                  )}
                </Box>

                {/* Connector after this step (except last) - all connectors share flex equally */}
                {!isLast && (
                  <Box
                    sx={{
                      flex: 1,
                      minWidth: CONNECTOR_WIDTH,
                      height: BORDER_WIDTH,
                      background: getConnectorBg(stepIndex, activeStep),
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
            ml: 1,
            width: 28,
            height: 28,
            borderRadius: 999,
            display: 'grid',
            placeItems: 'center',
            bgcolor: alpha(colors.oceanBlue, 0.12),
            border: '1px solid',
            borderColor: alpha(colors.oceanBlue, 0.28),
            color: colors.navyBlue,
            fontWeight: 900,
            fontSize: '0.8rem',
            flexShrink: 0,
          }}
        >
          {compactBadgeCount}
        </Box>
      </Stack>
    </Paper>
  )
}
