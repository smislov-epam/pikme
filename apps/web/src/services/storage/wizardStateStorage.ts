import { db } from '../../db'
import type { WizardStateRecord } from '../../db/types'

export async function loadWizardState<T>(): Promise<T | null> {
  const record = await db.wizardState.get('singleton')
  return (record?.data as T | undefined) ?? null
}

export async function saveWizardState<T>(data: T): Promise<void> {
  const record: WizardStateRecord = {
    id: 'singleton',
    data,
    updatedAt: new Date().toISOString(),
  }

  await db.wizardState.put(record)
}

export async function clearWizardState(): Promise<void> {
  await db.wizardState.delete('singleton')
}
