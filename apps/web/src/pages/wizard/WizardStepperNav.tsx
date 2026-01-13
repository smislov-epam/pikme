import { Step, StepButton, Stepper, alpha } from '@mui/material'
import { colors } from '../../theme/theme'
import { wizardSteps } from './wizardSteps'

export function WizardStepperNav(props: {
  activeStep: number
  completedSteps: boolean[]
  canJumpTo: (stepIndex: number) => boolean
  onSelectStep: (stepIndex: number) => void
}) {
  const { activeStep, completedSteps, canJumpTo, onSelectStep } = props

  return (
    <Stepper
      nonLinear
      activeStep={activeStep}
      sx={{
        mb: 3,
        '& .MuiStepConnector-line': {
          borderColor: alpha(colors.oceanBlue, 0.2),
        },
      }}
    >
      {wizardSteps.map((label, index) => (
        <Step key={label} completed={completedSteps[index]}>
          <StepButton
            color="inherit"
            disabled={!canJumpTo(index)}
            onClick={() => onSelectStep(index)}
            sx={{
              '& .MuiStepLabel-label': {
                fontWeight: activeStep === index ? 600 : 400,
              },
            }}
          >
            {label}
          </StepButton>
        </Step>
      ))}
    </Stepper>
  )
}
