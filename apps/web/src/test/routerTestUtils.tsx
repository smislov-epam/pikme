import type { PropsWithChildren } from 'react'
import { MemoryRouter } from 'react-router-dom'

export function RouterTestWrapper(props: PropsWithChildren<{ initialEntries?: string[] }>) {
  const { children, initialEntries } = props
  return <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
}
