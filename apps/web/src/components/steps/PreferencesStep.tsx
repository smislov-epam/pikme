import type { PreferencesStepProps } from './preferences/PreferencesStepContent'
import { PreferencesStepContent } from './preferences/PreferencesStepContent'

export type { PreferencesStepProps }

export function PreferencesStep(props: PreferencesStepProps) {
  return <PreferencesStepContent {...props} />
}
