import { WizardPageView } from './wizard/WizardPageView'
import { useWizardPageController } from './wizard/useWizardPageController'

export default function WizardPage() {
  const viewProps = useWizardPageController()
  return <WizardPageView {...viewProps} />
}
